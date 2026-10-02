import { PRODUCT_LIMITS } from '@cloudprint/config';
import type { DocumentErrorCode } from '@cloudprint/contracts';
import { PDFParse } from 'pdf-parse';
import * as yauzl from 'yauzl';

export type SupportedDocumentFormat = 'PDF' | 'DOCX';

export interface DocumentUpload {
  readonly originalFilename: string;
  readonly content: Buffer;
}

export interface AcceptedDocument {
  readonly accepted: true;
  readonly format: SupportedDocumentFormat;
  readonly sizeBytes: number;
  /** DOCX has no reliable page count until controlled server-side conversion finishes. */
  readonly pageCount: number | null;
  readonly requiresPdfConversion: boolean;
}

export interface RejectedDocument {
  readonly accepted: false;
  readonly errorCode: DocumentErrorCode;
  readonly message: string;
}

export type DocumentAdmissionResult = AcceptedDocument | RejectedDocument;

export interface PdfMetadataReader {
  inspect(content: Uint8Array): Promise<{ readonly pageCount: number }>;
}

export interface DocumentAdmissionLimits {
  readonly maxUploadBytes: number;
  readonly maxPages: number;
  readonly parsingTimeoutMs: number;
  readonly maxDocxArchiveEntries: number;
  readonly maxDocxUncompressedBytes: number;
  readonly maxDocxPartBytes: number;
}

export const DEFAULT_DOCUMENT_ADMISSION_LIMITS: DocumentAdmissionLimits = {
  maxUploadBytes: PRODUCT_LIMITS.maxUploadBytes,
  maxPages: PRODUCT_LIMITS.maxDocumentPages,
  parsingTimeoutMs: 20_000,
  maxDocxArchiveEntries: 2_500,
  maxDocxUncompressedBytes: 100_000_000,
  maxDocxPartBytes: 2_000_000,
};

/**
 * Admits only safe-enough source files to the asynchronous document worker.
 * It never trusts a filename or WhatsApp MIME type: it validates PDF bytes and
 * the OOXML package structure before storage or conversion.
 */
export class DocumentAdmissionService {
  public constructor(
    private readonly pdfMetadataReader: PdfMetadataReader = new PdfParseMetadataReader(),
    private readonly limits: DocumentAdmissionLimits = DEFAULT_DOCUMENT_ADMISSION_LIMITS,
  ) {
    assertLimits(limits);
  }

  public async inspect(upload: DocumentUpload): Promise<DocumentAdmissionResult> {
    const sizeBytes = upload.content.byteLength;
    if (sizeBytes === 0) return rejected('EMPTY_DOCUMENT', 'The uploaded file is empty.');
    if (sizeBytes > this.limits.maxUploadBytes) {
      return rejected('FILE_TOO_LARGE', `The uploaded file exceeds the ${this.limits.maxUploadBytes}-byte limit.`);
    }

    const expectedFormat = formatFromFilename(upload.originalFilename);
    if (expectedFormat === null) return rejected('UNSUPPORTED_FORMAT', 'Only PDF and DOCX files can be printed.');
    return expectedFormat === 'PDF'
      ? this.inspectPdf(upload.content, sizeBytes)
      : this.inspectDocx(upload.content, sizeBytes);
  }

  private async inspectPdf(content: Buffer, sizeBytes: number): Promise<DocumentAdmissionResult> {
    if (!hasPdfHeader(content)) {
      return rejected('FORMAT_MISMATCH', 'The file extension is PDF but its contents are not a PDF.');
    }

    try {
      const metadata = await withTimeout(this.pdfMetadataReader.inspect(content), this.limits.parsingTimeoutMs);
      if (!Number.isSafeInteger(metadata.pageCount) || metadata.pageCount < 1) {
        return rejected('EMPTY_DOCUMENT', 'The PDF does not contain printable pages.');
      }
      if (metadata.pageCount > this.limits.maxPages) {
        return rejected('PAGE_LIMIT_EXCEEDED', `The PDF has more than ${this.limits.maxPages} pages.`);
      }
      return { accepted: true, format: 'PDF', sizeBytes, pageCount: metadata.pageCount, requiresPdfConversion: false };
    } catch (error) {
      return rejected(classifyPdfError(error), 'The PDF could not be safely read.');
    }
  }

  private async inspectDocx(content: Buffer, sizeBytes: number): Promise<DocumentAdmissionResult> {
    if (!hasZipHeader(content)) {
      return rejected('FORMAT_MISMATCH', 'The file extension is DOCX but its contents are not an Office document package.');
    }
    try {
      await inspectDocxPackage(content, this.limits);
      return { accepted: true, format: 'DOCX', sizeBytes, pageCount: null, requiresPdfConversion: true };
    } catch (error) {
      if (error instanceof DocumentInspectionError) return rejected(error.code, error.message);
      return rejected('CORRUPT_DOCUMENT', 'The DOCX package could not be safely read.');
    }
  }
}

/** Real PDF metadata reader. It releases PDF.js resources on every outcome. */
export class PdfParseMetadataReader implements PdfMetadataReader {
  public async inspect(content: Uint8Array): Promise<{ readonly pageCount: number }> {
    const parser = new PDFParse({ data: content });
    try {
      const info = await parser.getInfo();
      return { pageCount: info.total };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}

class DocumentInspectionError extends Error {
  public constructor(public readonly code: DocumentErrorCode, message: string) {
    super(message);
  }
}

function rejected(errorCode: DocumentErrorCode, message: string): RejectedDocument {
  return { accepted: false, errorCode, message };
}

function formatFromFilename(filename: string): SupportedDocumentFormat | null {
  const normalized = filename.trim().toLowerCase();
  if (normalized.endsWith('.pdf')) return 'PDF';
  if (normalized.endsWith('.docx')) return 'DOCX';
  return null;
}

function hasPdfHeader(content: Buffer): boolean {
  return content.subarray(0, Math.min(content.byteLength, 1_024)).indexOf('%PDF-') !== -1;
}

function hasZipHeader(content: Buffer): boolean {
  return content.byteLength >= 4 && content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

async function inspectDocxPackage(content: Buffer, limits: DocumentAdmissionLimits): Promise<void> {
  const archive = await openZip(content);
  let settled = false;
  try {
    const requiredParts = new Map<string, yauzl.Entry>();
    let entryCount = 0;
    let declaredUncompressedBytes = 0;
    await new Promise<void>((resolve, reject) => {
      const fail = (error: unknown): void => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      archive.on('error', fail);
      archive.on('entry', (entry: yauzl.Entry) => {
        if (settled) return;
        entryCount += 1;
        declaredUncompressedBytes += entry.uncompressedSize;
        if (entryCount > limits.maxDocxArchiveEntries) {
          fail(new DocumentInspectionError('RESOURCE_LIMIT_EXCEEDED', 'The DOCX archive contains too many files.'));
          return;
        }
        if (declaredUncompressedBytes > limits.maxDocxUncompressedBytes) {
          fail(new DocumentInspectionError('RESOURCE_LIMIT_EXCEEDED', 'The DOCX archive expands beyond the permitted processing limit.'));
          return;
        }
        if (entry.isEncrypted()) {
          fail(new DocumentInspectionError('PASSWORD_PROTECTED', 'Password-protected DOCX files are not supported.'));
          return;
        }
        if (entry.fileName === '[Content_Types].xml' || entry.fileName === 'word/document.xml') {
          requiredParts.set(entry.fileName, entry);
        }
        archive.readEntry();
      });
      archive.on('end', () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      archive.readEntry();
    });

    const contentTypes = requiredParts.get('[Content_Types].xml');
    const documentXml = requiredParts.get('word/document.xml');
    if (contentTypes === undefined || documentXml === undefined) {
      throw new DocumentInspectionError('FORMAT_MISMATCH', 'The archive is not a DOCX document package.');
    }
    const [contentTypesXml, documentXmlText] = await Promise.all([
      readZipEntry(archive, contentTypes, limits.maxDocxPartBytes),
      readZipEntry(archive, documentXml, limits.maxDocxPartBytes),
    ]);
    if (!/<(?:\w+:)?Types\b/.test(contentTypesXml.toString('utf8')) || !/<(?:\w+:)?document\b/.test(documentXmlText.toString('utf8'))) {
      throw new DocumentInspectionError('FORMAT_MISMATCH', 'The archive is not a valid DOCX document package.');
    }
  } finally {
    archive.close();
  }
}

function openZip(content: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(content, { autoClose: false, lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (error, archive) => {
      if (error !== null) reject(error);
      else resolve(archive);
    });
  });
}

function readZipEntry(archive: yauzl.ZipFile, entry: yauzl.Entry, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    archive.openReadStream(entry, (openError, stream) => {
      if (openError !== null) return reject(openError);
      const chunks: Buffer[] = [];
      let byteCount = 0;
      stream.on('data', (chunk: Buffer) => {
        byteCount += chunk.byteLength;
        if (byteCount > maxBytes) stream.destroy(new DocumentInspectionError('RESOURCE_LIMIT_EXCEEDED', 'A DOCX package component is too large.'));
        else chunks.push(chunk);
      });
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new DocumentInspectionError('PROCESSING_TIMEOUT', 'Document processing exceeded its time limit.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function classifyPdfError(error: unknown): DocumentErrorCode {
  if (error instanceof DocumentInspectionError) return error.code;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('password') || message.includes('encrypted')) return 'PASSWORD_PROTECTED';
  if (message.includes('memory') || message.includes('allocation') || message.includes('resource')) return 'RESOURCE_LIMIT_EXCEEDED';
  return 'CORRUPT_DOCUMENT';
}

function assertLimits(limits: DocumentAdmissionLimits): void {
  for (const limit of Object.values(limits)) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Document admission limits must be positive safe integers.');
  }
}
