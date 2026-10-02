import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { FileStore } from '@cloudprint/application';

/**
 * Private development storage. Objects are addressed by server-generated keys,
 * never public paths; production can replace this adapter with an object store.
 */
export class LocalPrivateFileStore implements FileStore {
  private readonly root: string;

  public constructor(rootDirectory: string) {
    this.root = resolve(rootDirectory);
  }

  public async put(key: string, bytes: AsyncIterable<Uint8Array>, maxBytes: number): Promise<{ sizeBytes: number; sha256: string }> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('maxBytes must be a positive safe integer.');
    const destination = this.pathFor(key);
    await mkdir(dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx', 0o600);
    const hash = createHash('sha256');
    let sizeBytes = 0;

    try {
      for await (const chunk of bytes) {
        sizeBytes += chunk.byteLength;
        if (sizeBytes > maxBytes) throw new Error('Source document exceeds its admitted size limit.');
        hash.update(chunk);
        await handle.write(chunk);
      }
      await handle.sync();
      await handle.close();
      await rename(temporary, destination);
      return { sizeBytes, sha256: hash.digest('hex') };
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  public async *read(key: string): AsyncIterable<Uint8Array> {
    for await (const chunk of createReadStream(this.pathFor(key))) {
      yield chunk as Uint8Array;
    }
  }

  public async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    if (key.length === 0 || key.includes('\\')) throw new Error('Invalid storage key.');
    const candidate = resolve(this.root, key);
    if (candidate !== this.root && !candidate.startsWith(`${this.root}${sep}`)) throw new Error('Storage key escapes its root directory.');
    return candidate;
  }
}
