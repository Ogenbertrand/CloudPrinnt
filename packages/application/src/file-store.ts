/** A private object store. Implementations must reject unsafe keys and never publish source documents. */
export interface FileStore {
  put(key: string, bytes: AsyncIterable<Uint8Array>, maxBytes: number): Promise<{ sizeBytes: number; sha256: string }>;
  read(key: string): AsyncIterable<Uint8Array>;
  delete(key: string): Promise<void>;
}
