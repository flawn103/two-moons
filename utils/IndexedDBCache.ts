/**
 * IndexedDB缓存管理器，用于替代Cache API存储音频数据
 */

interface CacheEntry {
  key: string;
  data: ArrayBuffer;
  headers: Record<string, string>;
  timestamp: number;
}

interface DBSchema {
  audio_cache: {
    key: string;
    value: CacheEntry;
  };
}

export class IndexedDBCache {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName = "audio_cache_db", version = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  /**
   * 初始化IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建音频缓存对象存储
        if (!db.objectStoreNames.contains("audio_cache")) {
          const store = db.createObjectStore("audio_cache", { keyPath: "key" });
          // 创建时间戳索引用于清理过期数据
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  /**
   * 匹配缓存项（模拟Cache.match）
   */
  async match(key: string): Promise<Response | undefined> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("IndexedDB not initialized"));
        return;
      }

      const transaction = this.db.transaction(["audio_cache"], "readonly");
      const store = transaction.objectStore("audio_cache");
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get cache entry: ${request.error}`));
      };

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (entry) {
          // 创建Response对象
          const response = new Response(entry.data.slice(0), {
            headers: entry.headers,
          });
          resolve(response);
        } else {
          resolve(undefined);
        }
      };
    });
  }

  /**
   * 存储缓存项（模拟Cache.put）
   */
  async put(key: string, response: Response): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("IndexedDB not initialized"));
        return;
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });

      response
        .arrayBuffer()
        .then((arrayBuffer) => {
          const entry: CacheEntry = {
            key,
            data: arrayBuffer,
            headers,
            timestamp: Date.now(),
          };

          const transaction = this.db!.transaction(
            ["audio_cache"],
            "readwrite"
          );
          const store = transaction.objectStore("audio_cache");
          const request = store.put(entry);

          request.onerror = () => {
            reject(new Error(`Failed to put cache entry: ${request.error}`));
          };

          request.onsuccess = () => {
            resolve();
          };
        })
        .catch((error) => {
          reject(new Error(`Failed to read response data: ${error}`));
        });
    });
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("IndexedDB not initialized"));
        return;
      }

      const transaction = this.db.transaction(["audio_cache"], "readwrite");
      const store = transaction.objectStore("audio_cache");
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error(`Failed to delete cache entry: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheInfo(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: number;
    newestEntry?: number;
  }> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("IndexedDB not initialized"));
        return;
      }

      const transaction = this.db.transaction(["audio_cache"], "readonly");
      const store = transaction.objectStore("audio_cache");
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get cache info: ${request.error}`));
      };

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const totalEntries = entries.length;
        const totalSize = entries.reduce(
          (sum, entry) => sum + entry.data.byteLength,
          0
        );
        const timestamps = entries
          .map((entry) => entry.timestamp)
          .filter(Boolean);

        resolve({
          totalEntries,
          totalSize,
          oldestEntry:
            timestamps.length > 0 ? Math.min(...timestamps) : undefined,
          newestEntry:
            timestamps.length > 0 ? Math.max(...timestamps) : undefined,
        });
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
