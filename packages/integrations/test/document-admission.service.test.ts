import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DocumentAdmissionService,
  PdfParseMetadataReader,
  type DocumentAdmissionLimits,
  type PdfMetadataReader,
} from '../src/documents/document-admission.service.js';

const limits: DocumentAdmissionLimits = {
  maxUploadBytes: 1_000,
  maxPages: 10,
  parsingTimeoutMs: 50,
  maxDocxArchiveEntries: 10,
  maxDocxUncompressedBytes: 1_000,
  maxDocxPartBytes: 500,
};

class Reader implements PdfMetadataReader {
  public constructor(private readonly pageCount: number, private readonly error?: Error) {}
  public async inspect(): Promise<{ readonly pageCount: number }> {
    if (this.error !== undefined) throw this.error;
    return { pageCount: this.pageCount };
  }
}

test('admits a PDF only after parser page metadata is valid', async () => {
  const result = await new DocumentAdmissionService(new Reader(3), limits).inspect({
    originalFilename: 'lecture.pdf', content: Buffer.from('%PDF-1.7\ncontent'),
  });
  assert.deepEqual(result, {
    accepted: true, format: 'PDF', sizeBytes: 16, pageCount: 3, requiresPdfConversion: false,
  });
});

test('the PDF adapter reads the page count from an actual PDF', async () => {
  const result = await new PdfParseMetadataReader().inspect(createMinimalPdf());
  assert.equal(result.pageCount, 1);
});

test('rejects extension and signature mismatches before PDF parsing', async () => {
  const result = await new DocumentAdmissionService(new Reader(3), limits).inspect({
    originalFilename: 'lecture.pdf', content: Buffer.from('not a pdf'),
  });
  assert.equal(result.accepted, false);
  assert.equal(result.errorCode, 'FORMAT_MISMATCH');
});

test('enforces the upload and page limits', async () => {
  const fileTooLarge = await new DocumentAdmissionService(new Reader(3), limits).inspect({
    originalFilename: 'lecture.pdf', content: Buffer.alloc(1_001, '%'.charCodeAt(0)),
  });
  const tooManyPages = await new DocumentAdmissionService(new Reader(11), limits).inspect({
    originalFilename: 'lecture.pdf', content: Buffer.from('%PDF-1.7'),
  });
  assert.equal(fileTooLarge.accepted, false);
  assert.equal(fileTooLarge.errorCode, 'FILE_TOO_LARGE');
  assert.equal(tooManyPages.accepted, false);
  assert.equal(tooManyPages.errorCode, 'PAGE_LIMIT_EXCEEDED');
});

test('maps protected and unreadable PDFs to safe machine-readable errors', async () => {
  const protectedResult = await new DocumentAdmissionService(new Reader(0, new Error('PasswordException')), limits).inspect({
    originalFilename: 'protected.pdf', content: Buffer.from('%PDF-1.7'),
  });
  const corruptResult = await new DocumentAdmissionService(new Reader(0, new Error('invalid xref')), limits).inspect({
    originalFilename: 'broken.pdf', content: Buffer.from('%PDF-1.7'),
  });
  assert.equal(protectedResult.accepted, false);
  assert.equal(protectedResult.errorCode, 'PASSWORD_PROTECTED');
  assert.equal(corruptResult.accepted, false);
  assert.equal(corruptResult.errorCode, 'CORRUPT_DOCUMENT');
});

test('admits only DOCX archives containing the mandatory OOXML parts', async () => {
  const validDocx = createStoredZip({
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'word/document.xml': '<w:document xmlns:w="urn:cloudprint"><w:body/></w:document>',
  });
  const invalidDocx = createStoredZip({ 'word/document.xml': '<w:document/>' });
  const service = new DocumentAdmissionService(new Reader(1), limits);
  const accepted = await service.inspect({ originalFilename: 'notes.docx', content: validDocx });
  const rejected = await service.inspect({ originalFilename: 'notes.docx', content: invalidDocx });
  assert.deepEqual(accepted, {
    accepted: true, format: 'DOCX', sizeBytes: validDocx.byteLength, pageCount: null, requiresPdfConversion: true,
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.errorCode, 'FORMAT_MISMATCH');
});

function createStoredZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(value);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.byteLength, 18);
    local.writeUInt32LE(data.byteLength, 22);
    local.writeUInt16LE(nameBytes.byteLength, 26);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.byteLength, 20);
    central.writeUInt32LE(data.byteLength, 24);
    central.writeUInt16LE(nameBytes.byteLength, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, nameBytes);
    offset += local.byteLength + nameBytes.byteLength + data.byteLength;
  }
  const centralDirectory = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

function createMinimalPdf(): Buffer {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}
