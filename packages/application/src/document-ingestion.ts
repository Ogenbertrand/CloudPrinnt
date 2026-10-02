import type { FileStore } from './file-store.js';

export type SourceFormat = 'PDF' | 'DOCX';
export type StoredDocumentStatus = 'READY' | 'PROCESSING';

export interface DocumentAdmissionResult {
  readonly accepted: boolean;
  readonly errorCode?: string;
  readonly message?: string;
  readonly format?: SourceFormat;
  readonly sizeBytes?: number;
  readonly pageCount?: number | null;
  readonly requiresPdfConversion?: boolean;
}

export interface DocumentAdmissionPort {
  inspect(input: { readonly originalFilename: string; readonly content: Uint8Array }): Promise<DocumentAdmissionResult>;
}

export interface DocumentIngestionRepository {
  createDocument(input: {
    readonly sourceStorageKey: string;
    readonly originalFilename: string;
    readonly sourceFormat: SourceFormat;
    readonly sourceSizeBytes: number;
    readonly sourceSha256: string;
    readonly pageCount: number | null;
    readonly status: StoredDocumentStatus;
  }): Promise<{ readonly id: string }>;
}

export interface IngestedDocument {
  readonly accepted: true;
  readonly documentId: string;
  readonly sourceStorageKey: string;
  readonly format: SourceFormat;
  readonly status: StoredDocumentStatus;
  readonly pageCount: number | null;
}

export interface RejectedIngestion {
  readonly accepted: false;
  readonly errorCode: string;
  readonly message: string;
}

export type DocumentIngestionResult = IngestedDocument | RejectedIngestion;

/**
 * Coordinates validation, private storage, and persistence. It leaves no
 * permanent source file behind when persistence fails after a successful put.
 */
export class DocumentIngestionService {
  public constructor(
    private readonly admission: DocumentAdmissionPort,
    private readonly fileStore: FileStore,
    private readonly documents: DocumentIngestionRepository,
    private readonly createStorageKey: () => string,
  ) {}

  public async ingest(input: { readonly originalFilename: string; readonly content: Uint8Array }): Promise<DocumentIngestionResult> {
    const admission = await this.admission.inspect(input);
    if (!isAccepted(admission)) {
      return {
        accepted: false,
        errorCode: admission.errorCode ?? 'CORRUPT_DOCUMENT',
        message: admission.message ?? 'The document could not be processed.',
      };
    }

    const sourceStorageKey = `source/${this.createStorageKey()}`;
    const stored = await this.fileStore.put(sourceStorageKey, bufferChunks(input.content), admission.sizeBytes);
    if (stored.sizeBytes !== admission.sizeBytes) {
      await this.fileStore.delete(sourceStorageKey).catch(() => undefined);
      throw new Error('Stored document size does not match admission result.');
    }

    const status: StoredDocumentStatus = admission.requiresPdfConversion ? 'PROCESSING' : 'READY';
    try {
      const document = await this.documents.createDocument({
        sourceStorageKey,
        originalFilename: input.originalFilename,
        sourceFormat: admission.format,
        sourceSizeBytes: stored.sizeBytes,
        sourceSha256: stored.sha256,
        pageCount: admission.pageCount,
        status,
      });
      return {
        accepted: true,
        documentId: document.id,
        sourceStorageKey,
        format: admission.format,
        status,
        pageCount: admission.pageCount,
      };
    } catch (error) {
      await this.fileStore.delete(sourceStorageKey).catch(() => undefined);
      throw error;
    }
  }
}

function isAccepted(result: DocumentAdmissionResult): result is DocumentAdmissionResult & {
  readonly accepted: true;
  readonly format: SourceFormat;
  readonly sizeBytes: number;
  readonly pageCount: number | null;
  readonly requiresPdfConversion: boolean;
} {
  return result.accepted
    && (result.format === 'PDF' || result.format === 'DOCX')
    && Number.isSafeInteger(result.sizeBytes ?? NaN)
    && (result.sizeBytes ?? 0) > 0
    && (result.pageCount === null || (Number.isSafeInteger(result.pageCount ?? NaN) && (result.pageCount ?? 0) > 0))
    && typeof result.requiresPdfConversion === 'boolean';
}

async function* bufferChunks(content: Uint8Array): AsyncIterable<Uint8Array> {
  yield content;
}
