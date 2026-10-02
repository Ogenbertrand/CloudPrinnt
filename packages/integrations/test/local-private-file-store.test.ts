import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalPrivateFileStore } from '../src/storage/local-private-file-store.js';

test('writes hashed private source bytes and reads them back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cloudprint-store-'));
  try {
    const store = new LocalPrivateFileStore(root);
    const stored = await store.put('source/document-1', chunks('hello', ' world'), 20);
    const received: Buffer[] = [];
    for await (const chunk of store.read('source/document-1')) received.push(Buffer.from(chunk));
    assert.equal(stored.sizeBytes, 11);
    assert.equal(stored.sha256, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    assert.equal(Buffer.concat(received).toString(), 'hello world');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses traversal and removes incomplete oversized writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cloudprint-store-'));
  try {
    const store = new LocalPrivateFileStore(root);
    await assert.rejects(() => store.put('../outside', chunks('x'), 1), /escapes/);
    await assert.rejects(() => store.put('source/too-large', chunks('123', '456'), 5), /exceeds/);
    assert.deepEqual(await readdir(join(root, 'source')), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function* chunks(...values: string[]): AsyncIterable<Uint8Array> {
  for (const value of values) yield Buffer.from(value);
}
