import fs from 'fs/promises';
import path from 'path';
import { Mutex } from 'async-mutex';

const fileMutexes = new Map<string, Mutex>();

function getMutex(filepath: string): Mutex {
  const normalized = path.normalize(filepath);
  if (!fileMutexes.has(normalized)) {
    fileMutexes.set(normalized, new Mutex());
  }
  return fileMutexes.get(normalized)!;
}

export class JsonStore {
  /**
   * Safely read JSON from disk. If the file does not exist, writes the fallback data.
   */
  static async read<T>(filepath: string, fallback: T): Promise<T> {
    const mutex = getMutex(filepath);
    return await mutex.runExclusive(async () => {
      try {
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        const content = await fs.readFile(filepath, 'utf-8');
        return JSON.parse(content) as T;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File does not exist, initialize with fallback
          await JsonStore.atomicWrite(filepath, fallback);
          return fallback;
        }
        throw err;
      }
    });
  }

  /**
   * Read-modify-write helper wrapped in mutex. Ensures safe concurrent updates.
   */
  static async update<T>(
    filepath: string,
    fallback: T,
    mutator: (current: T) => Promise<T> | T
  ): Promise<T> {
    const mutex = getMutex(filepath);
    return await mutex.runExclusive(async () => {
      let current: T;
      try {
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        const content = await fs.readFile(filepath, 'utf-8');
        current = JSON.parse(content) as T;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          current = fallback;
        } else {
          throw err;
        }
      }

      const updated = await mutator(current);
      await JsonStore.atomicWrite(filepath, updated);
      return updated;
    });
  }

  private static async atomicWrite<T>(filepath: string, data: T): Promise<void> {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    const tmpPath = `${filepath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, filepath);
  }
}
