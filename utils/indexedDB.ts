/**
 * IndexedDB 工具类，用于存储乐句数据
 */

import { api } from "@/services/api";
import { appStore } from "@/stores/store";

interface DBConfig {
  dbName: string;
  version: number;
  storeName: string;
}

export class IndexedDBManager {
  private config: DBConfig;
  private db: IDBDatabase | null = null;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private isInitialSyncDone = false;

  constructor(config: DBConfig) {
    this.config = config;
  }

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储空间
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });

          // 创建索引
          store.createIndex("key", "key", { unique: true });
        }
      };
    });
  }

  /**
   * 存储数据
   */
  async setItem(key: string, value: any, field?: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);

      const data = {
        key,
        value: JSON.stringify(value),
        timestamp: Date.now(),
        field,
      };

      // 先尝试获取现有记录
      const getRequest = store.index("key").get(key);

      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;

        if (existingRecord) {
          // 更新现有记录
          const updateRequest = store.put({ ...data, id: existingRecord.id });
          updateRequest.onsuccess = () => {
            resolve();
            // 初始化同步完成后，才进行远程同步
            if (this.isInitialSyncDone) {
              this.debouncedSyncToRemote(key, value, data.timestamp, field);
            }
          };
          updateRequest.onerror = () =>
            reject(new Error("Failed to update data"));
        } else {
          // 添加新记录
          const addRequest = store.add(data);
          addRequest.onsuccess = () => {
            resolve();
            // 初始化同步完成后，才进行远程同步
            if (this.isInitialSyncDone) {
              this.debouncedSyncToRemote(key, value, data.timestamp, field);
            }
          };
          addRequest.onerror = () => reject(new Error("Failed to add data"));
        }
      };

      getRequest.onerror = () =>
        reject(new Error("Failed to check existing data"));
    });
  }

  /**
   * 获取数据
   */
  async getItem(key: string): Promise<any> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readonly"
      );
      const store = transaction.objectStore(this.config.storeName);
      const request = store.index("key").get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          try {
            resolve(JSON.parse(result.value));
          } catch (error) {
            reject(new Error("Failed to parse stored data"));
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error("Failed to get data"));
      };
    });
  }

  /**
   * 删除数据
   */
  async removeItem(key: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);

      // 先获取记录ID
      const getRequest = store.index("key").get(key);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          const deleteRequest = store.delete(record.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () =>
            reject(new Error("Failed to delete data"));
        } else {
          resolve(); // 记录不存在，视为删除成功
        }
      };

      getRequest.onerror = () =>
        reject(new Error("Failed to find data to delete"));
    });
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to clear data"));
    });
  }

  /**
   * 获取所有数据（用于同步）
   */
  async getAllItems(): Promise<
    Array<{ key: string; value: any; timestamp: number; field?: string }>
  > {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readonly"
      );
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map((item) => ({
          key: item.key,
          value: JSON.parse(item.value ?? "{}"),
          timestamp: item.timestamp,
          field: item.field,
        }));
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error("Failed to get all data"));
      };
    });
  }

  /**
   * 初始化数据同步
   */
  async initSync(): Promise<void> {
    try {
      // 获取远程数据
      const remoteData = await this.fetchRemoteUserData();

      // 获取本地数据
      const localData = await this.getAllItems();

      // 创建本地数据映射
      const localDataMap = new Map();
      localData.forEach((item) => {
        localDataMap.set(item.key, item);
      });

      // 同步逻辑
      const updatedRemoteData = { ...remoteData };
      let hasRemoteUpdates = false;

      // 遍历远程数据
      for (const [key, remoteItem] of Object.entries(remoteData)) {
        const localItem = localDataMap.get(key);

        // console.log({ key, remoteItem, localItem });
        if (!localItem) {
          // 本地没有，使用远程数据
          await this.setItemWithoutSync(
            key,
            (remoteItem as any).value,
            (remoteItem as any).timestamp
          );
        } else if (localItem.timestamp > (remoteItem as any).timestamp) {
          // 本地更新，推送到远程
          updatedRemoteData[key] = {
            value: localItem.value,
            timestamp: localItem.timestamp,
          };
          console.log({ updatedRemoteData });
          hasRemoteUpdates = true;
        } else if (localItem.timestamp < (remoteItem as any).timestamp) {
          // 远程更新，覆盖本地
          await this.setItemWithoutSync(
            key,
            (remoteItem as any).value,
            (remoteItem as any).timestamp
          );
        }

        // 从本地映射中移除已处理的项
        localDataMap.delete(key);
      }

      // 处理本地独有的数据（推送到远程）
      for (const [key, localItem] of localDataMap) {
        updatedRemoteData[key] = {
          value: localItem.value,
          timestamp: localItem.timestamp,
        };

        console.log("has something left need to push", key);
        hasRemoteUpdates = true;
      }

      // 如果有远程更新，推送到服务器
      if (hasRemoteUpdates) {
        await this.updateRemoteUserData(updatedRemoteData);
      }

      console.log("Data sync initialization completed");
    } catch (error) {
      console.error("Failed to initialize data sync:", error);
    } finally {
      // 即使同步失败，也标记为完成，避免阻塞正常使用
      this.isInitialSyncDone = true;
    }
  }

  /**
   * 不触发同步的setItem（用于同步过程中）
   */
  private async setItemWithoutSync(
    key: string,
    value: any,
    timestamp?: number,
    field?: string
  ): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);

      const data = {
        key,
        value: JSON.stringify(value),
        timestamp: timestamp || Date.now(),
        field,
      };

      // 先尝试获取现有记录
      const getRequest = store.index("key").get(key);

      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;

        if (existingRecord) {
          // 更新现有记录
          const updateRequest = store.put({ ...data, id: existingRecord.id });
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () =>
            reject(new Error("Failed to update data"));
        } else {
          // 添加新记录
          const addRequest = store.add(data);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(new Error("Failed to add data"));
        }
      };

      getRequest.onerror = () =>
        reject(new Error("Failed to check existing data"));
    });
  }

  /**
   * 防抖的远程同步
   */
  private debouncedSyncToRemote(
    key: string,
    value: any,
    timestamp: number,
    field?: string
  ): void {
    // 清除之前的定时器
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // 设置新的定时器（5秒防抖）
    this.syncDebounceTimer = setTimeout(async () => {
      try {
        appStore.syncing = true;
        await this.syncSingleItemToRemote(key, value, timestamp, field);
      } catch (error) {
        console.error("Failed to sync to remote:", error);
      } finally {
        appStore.syncing = false;
      }
    }, 500);
  }

  /**
   * 同步单个项目到远程
   */
  private async syncSingleItemToRemote(
    key: string,
    value: any,
    timestamp: number,
    field?: string
  ): Promise<void> {
    try {
      const localData = await this.getAllItems();
      const fullDataMap = {};
      localData.forEach(({ key: k, field: f, ...others }) => {
        if (f === field) {
          fullDataMap[k] = others;
        }
      });
      // 更新指定key的数据
      fullDataMap[key] = {
        value,
        timestamp,
      };

      // 推送到远程
      await this.updateRemoteUserData(fullDataMap, field);

      console.log(`Synced ${key} to remote successfully`);
    } catch (error) {
      console.error(`Failed to sync ${key} to remote:`, error);
      throw error;
    }
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string {
    try {
      const authData = localStorage.getItem("auth");
      if (authData) {
        const auth = JSON.parse(authData);
        return auth.token || "";
      }
      return "";
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return "";
    }
  }

  /**
   * 获取远程用户数据
   */
  private async fetchRemoteUserData(): Promise<
    Record<string, { value: any; timestamp: number }>
  > {
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.warn("No auth token available for sync");
        return {};
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_BASE ?? ""}/api/user/sync-data`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "authorization-auth": token,
          },
        }
      );

      const data = JSON.parse(await response.json());
      return data || {};
    } catch (error) {
      console.error("Failed to fetch remote user data:", error);
      return {};
    }
  }

  /**
   * 更新远程用户数据
   */
  async updateRemoteUserData(
    userData: Record<string, { value: any; timestamp: number }>,
    field?: string
  ): Promise<void> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return;
      }

      const response = await api.put("/user/sync-data", {
        userData,
        field,
      });

      console.log("Remote user data updated successfully");
    } catch (error) {
      console.error("Failed to update remote user data:", error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // 清除防抖定时器
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }
}

// 创建乐句数据库实例
const pool = new IndexedDBManager({
  dbName: "LuvClub",
  version: 1,
  storeName: "userData",
});

// 兼容 localStorage 的接口
export const createStorageAdapter = (dbManager: IndexedDBManager) => {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const value = await dbManager.getItem(key);
        return value ? JSON.stringify(value) : null;
      } catch (error) {
        console.error("IndexedDB getItem error:", error);
        return null;
      }
    },

    async setItem(key: string, value: string, field?: string): Promise<void> {
      try {
        const parsedValue = JSON.parse(value);
        await dbManager.setItem(key, parsedValue, field);
      } catch (error) {
        console.error("IndexedDB setItem error:", error);
        throw error;
      }
    },

    async removeItem(key: string): Promise<void> {
      try {
        await dbManager.removeItem(key);
      } catch (error) {
        console.error("IndexedDB removeItem error:", error);
        throw error;
      }
    },
  };
};

export const db = createStorageAdapter(pool);

// Export original IndexedDBManager instance for manual sync trigger
export const dbManager = pool;
