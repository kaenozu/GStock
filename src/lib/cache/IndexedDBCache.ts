export class IndexedDBCache {
    private dbName: string;
    private version: number;
    private db: IDBDatabase | null = null;

    constructor(dbName: string = 'gstock-cache', version: number = 1) {
        this.dbName = dbName;
        this.version = version;
    }

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('api-cache')) {
                    db.createObjectStore('api-cache', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('analysis-history')) {
                    db.createObjectStore('analysis-history', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('push-tokens')) {
                    db.createObjectStore('push-tokens', { keyPath: 'token' });
                }
            };
        });
    }

    async get(storeName: string, key: string): Promise<any> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result?.value);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get ${key} from ${storeName}`));
            };
        });
    }

    async set(storeName: string, key: string, value: any): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ key, value, timestamp: Date.now() });

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to set ${key} in ${storeName}`));
            };
        });
    }

    async delete(storeName: string, key: string): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete ${key} from ${storeName}`));
            };
        });
    }

    async clear(storeName: string): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear ${storeName}`));
            };
        });
    }

    async getAll(storeName: string): Promise<any[]> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get all from ${storeName}`));
            };
        });
    }

    async deleteOldEntries(storeName: string, maxAge: number): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            const cutoff = Date.now() - maxAge;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const data = cursor.value;
                    if (data.timestamp && data.timestamp < cutoff) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete old entries from ${storeName}`));
            };
        });
    }

    async getStats(): Promise<{ [key: string]: number }> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const stats: { [key: string]: number } = {};
            const storeNames = Array.from(this.db!.objectStoreNames);

            let completed = 0;

            storeNames.forEach((storeName) => {
                const transaction = this.db!.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();

                request.onsuccess = () => {
                    stats[storeName] = request.result;
                    completed++;

                    if (completed === storeNames.length) {
                        resolve(stats);
                    }
                };

                request.onerror = () => {
                    reject(new Error(`Failed to get stats for ${storeName}`));
                };
            });
        });
    }
}

export const indexedDBCache = new IndexedDBCache();