import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DocumentIngestionService,
  type DocumentAdmissionPort,
  type DocumentAdmissionResult,
  type DocumentIngestionRepository,
  type FileStore,
} from '../src/index.js';

class Admission implements DocumentAdmissionPort {
  public constructor(private readonly result: DocumentAdmissionResult) {}
  public async inspect(): Promise<DocumentAdmissionResult> { return this.result; }
}

class Store implements FileStore {
  public deletedKeys: string[] = [];
  public async put(_key: string, bytes: AsyncIterable<Uint8Array>): Promise<{ sizeBytes: number; sha256: string }> {
    let sizeBytes = 0;
    for await (const chunk of bytes) sizeBytes += chunk.byteLength;
    return { sizeBytes, sha256: 'a'.repeat(64) };
  }
  public async *read(): AsyncIterable<Uint8Array> { yield Buffer.alloc(0); }
  public async delete(key: string): Promise<void> { this.deletedKeys.push(key); }
}

class Repository implements DocumentIngestionRepository {
  public constructor(private readonly shouldFail = false) {}
  public async createDocument(): Promise<{ readonly id: string }> {
    if (this.shouldFail) throw new Error('database unavailable');
    return { id: 'document-123' };
  }
}

test('persists an admitted PDF as a ready document', async () => {
  const service = new DocumentIngestionService(
    new Admission({ accepted: true, format: 'PDF', sizeBytes: 4, pageCount: 1, requiresPdfConversion: false }),
    new Store(),
    new Repository(),
    () => 'document-123',
  );
  const result = await service.ingest({ originalFilename: 'notes.pdf', content: Buffer.from('data') });
  assert.equal(result.accepted, true);
  if (result.accepted) {
    assert.equal(result.status, 'READY');
    assert.equal(result.pageCount, 1);
    assert.equal(result.sourceStorageKey, 'source/document-123');
  }
});

test('persists an admitted DOCX as processing until conversion returns a prepared PDF', async () => {
  const service = new DocumentIngestionService(
    new Admission({ accepted: true, format: 'DOCX', sizeBytes: 4, pageCount: null, requiresPdfConversion: true }),
    new Store(),
    new Repository(),
    () => 'document-123',
  );
  const result = await service.ingest({ originalFilename: 'notes.docx', content: Buffer.from('data') });
  assert.equal(result.accepted, true);
  if (result.accepted) assert.equal(result.status, 'PROCESSING');
});

test('returns admission errors without writing a source object', async () => {
  const store = new Store();
  const service = new DocumentIngestionService(
    new Admission({ accepted: false, errorCode: 'UNSUPPORTED_FORMAT', message: 'Only PDF and DOCX files can be printed.' }),
    store,
    new Repository(),
    () => 'document-123',
  );
  const result = await service.ingest({ originalFilename: 'notes.exe', content: Buffer.from('data') });
  assert.deepEqual(result, {
    accepted: false, errorCode: 'UNSUPPORTED_FORMAT', message: 'Only PDF and DOCX files can be printed.',
  });
  assert.deepEqual(store.deletedKeys, []);
});

test('deletes the private object when persistence fails', async () => {
  const store = new Store();
  const service = new DocumentIngestionService(
    new Admission({ accepted: true, format: 'PDF', sizeBytes: 4, pageCount: 1, requiresPdfConversion: false }),
    store,
    new Repository(true),
    () => 'document-123',
  );
  await assert.rejects(() => service.ingest({ originalFilename: 'notes.pdf', content: Buffer.from('data') }), /database unavailable/);
  assert.equal(store.deletedKeys.length, 1);
});
