/**
 * =====================================================
 * INDEXED DB MANAGEMENT
 * =====================================================
 */

const DB_NAME = 'PharmacyAnalyticsDB';
const DB_VERSION = 1;
const STORE_NAMES = {
    SALES: 'sales_data',
    BC: 'bc_data',
    METADATA: 'metadata'
};

class PharmacyDatabase {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAMES.SALES)) {
                    const salesStore = db.createObjectStore(STORE_NAMES.SALES, { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('date', 'parsedDate', { unique: false });
                    salesStore.createIndex('invoice_no', 'invoice_no', { unique: false });
                    salesStore.createIndex('service_point', 'service_point', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORE_NAMES.BC)) {
                    const bcStore = db.createObjectStore(STORE_NAMES.BC, { keyPath: 'id', autoIncrement: true });
                    bcStore.createIndex('description', 'description', { unique: false });
                    bcStore.createIndex('item_code', 'item_code', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORE_NAMES.METADATA)) {
                    db.createObjectStore(STORE_NAMES.METADATA, { keyPath: 'key' });
                }
            };
        });
    }

    async addSalesData(salesArray) {
        const transaction = this.db.transaction([STORE_NAMES.SALES], 'readwrite');
        const store = transaction.objectStore(STORE_NAMES.SALES);

        return new Promise((resolve, reject) => {
            salesArray.forEach(item => {
                store.add(item);
            });

            transaction.oncomplete = () => {
                console.log(`Added ${salesArray.length} sales records`);
                resolve();
            };

            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    async getAllSalesData() {
        const transaction = this.db.transaction([STORE_NAMES.SALES], 'readonly');
        const store = transaction.objectStore(STORE_NAMES.SALES);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async addBCData(bcArray) {
        const transaction = this.db.transaction([STORE_NAMES.BC], 'readwrite');
        const store = transaction.objectStore(STORE_NAMES.BC);

        return new Promise((resolve, reject) => {
            bcArray.forEach(item => {
                store.add(item);
            });

            transaction.oncomplete = () => {
                console.log(`Added ${bcArray.length} BC records`);
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getAllBCData() {
        const transaction = this.db.transaction([STORE_NAMES.BC], 'readonly');
        const store = transaction.objectStore(STORE_NAMES.BC);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async setMetadata(key, value) {
        const transaction = this.db.transaction([STORE_NAMES.METADATA], 'readwrite');
        const store = transaction.objectStore(STORE_NAMES.METADATA);
        const request = store.put({ key, value });

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                resolve();
            };
            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getMetadata(key) {
        const transaction = this.db.transaction([STORE_NAMES.METADATA], 'readonly');
        const store = transaction.objectStore(STORE_NAMES.METADATA);
        const request = store.get(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async clearAllData() {
        const transaction = this.db.transaction(
            [STORE_NAMES.SALES, STORE_NAMES.BC, STORE_NAMES.METADATA],
            'readwrite'
        );

        return new Promise((resolve, reject) => {
            transaction.objectStore(STORE_NAMES.SALES).clear();
            transaction.objectStore(STORE_NAMES.BC).clear();
            transaction.objectStore(STORE_NAMES.METADATA).clear();

            transaction.oncomplete = () => {
                console.log('All data cleared');
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getSalesDataByDateRange(startDate, endDate) {
        const transaction = this.db.transaction([STORE_NAMES.SALES], 'readonly');
        const store = transaction.objectStore(STORE_NAMES.SALES);
        const index = store.index('date');
        const range = IDBKeyRange.bound(startDate, endDate);
        const request = index.getAll(range);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

const db = new PharmacyDatabase();