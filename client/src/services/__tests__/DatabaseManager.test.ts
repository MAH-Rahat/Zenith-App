import { databaseManager } from '../DatabaseManager';

// expo-sqlite is mocked via __mocks__/expo-sqlite.js

describe('DatabaseManager', () => {
  beforeEach(async () => {
    // Reset the database state before each test
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize database successfully', async () => {
      await databaseManager.init();
      expect(databaseManager['isInitialized']).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await databaseManager.init();
      const firstDb = databaseManager['db'];
      
      await databaseManager.init();
      const secondDb = databaseManager['db'];
      
      expect(firstDb).toBe(secondDb);
    });

    it('should handle concurrent initialization calls', async () => {
      const promises = [
        databaseManager.init(),
        databaseManager.init(),
        databaseManager.init(),
      ];
      
      await Promise.all(promises);
      expect(databaseManager['isInitialized']).toBe(true);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should execute SELECT query successfully', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      databaseManager['db'].getAllAsync = jest.fn(() => Promise.resolve(mockData));

      const result = await databaseManager.query('SELECT * FROM test');
      expect(result).toEqual(mockData);
    });

    it('should retry query on failure', async () => {
      let callCount = 0;
      databaseManager['db'].getAllAsync = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Query failed'));
        }
        return Promise.resolve([{ id: 1 }]);
      });

      const result = await databaseManager.query('SELECT * FROM test');
      expect(result).toEqual([{ id: 1 }]);
      expect(callCount).toBe(2);
    });

    it('should return default value after retry failure', async () => {
      databaseManager['db'].getAllAsync = jest.fn(() => 
        Promise.reject(new Error('Query failed'))
      );

      const result = await databaseManager.query('SELECT * FROM test');
      expect(result).toEqual([]);
    });
  });

  describe('Insert Operations', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should insert data successfully', async () => {
      const data = { name: 'Test', value: 123 };
      const result = await databaseManager.insert('test_table', data);
      
      expect(result).toBe(1);
      expect(databaseManager['db'].runAsync).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, value) VALUES (?, ?)',
        ['Test', 123]
      );
    });

    it('should retry insert on failure', async () => {
      let callCount = 0;
      databaseManager['db'].runAsync = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Insert failed'));
        }
        return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
      });

      const result = await databaseManager.insert('test_table', { name: 'Test' });
      expect(result).toBe(1);
      expect(callCount).toBe(2);
    });
  });

  describe('Update Operations', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should update data successfully', async () => {
      await databaseManager.update(
        'test_table',
        { name: 'Updated' },
        'id = ?',
        [1]
      );

      expect(databaseManager['db'].runAsync).toHaveBeenCalledWith(
        'UPDATE test_table SET name = ? WHERE id = ?',
        ['Updated', 1]
      );
    });
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should delete data successfully', async () => {
      await databaseManager.delete('test_table', 'id = ?', [1]);

      expect(databaseManager['db'].runAsync).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = ?',
        [1]
      );
    });
  });

  describe('Transaction Support', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should execute transaction successfully', async () => {
      const callback = jest.fn();
      await databaseManager.transaction(callback);

      expect(databaseManager['db'].withTransactionAsync).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const callback = jest.fn(() => Promise.reject(new Error('Transaction error')));

      await expect(databaseManager.transaction(callback)).rejects.toThrow();
    });

    it('should execute batch write atomically', async () => {
      const operations = [
        { sql: 'INSERT INTO test (name) VALUES (?)', params: ['Test1'] },
        { sql: 'INSERT INTO test (name) VALUES (?)', params: ['Test2'] },
      ];

      await databaseManager.batchWrite(operations);

      expect(databaseManager['db'].withTransactionAsync).toHaveBeenCalled();
    });

    it('should bulk insert multiple rows', async () => {
      const rows = [
        { name: 'Test1', value: 1 },
        { name: 'Test2', value: 2 },
      ];

      await databaseManager.bulkInsert('test_table', rows);

      expect(databaseManager['db'].withTransactionAsync).toHaveBeenCalled();
      expect(databaseManager['db'].runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Check', () => {
    it('should return true when database is healthy', async () => {
      await databaseManager.init();
      databaseManager['db'].getAllAsync = jest.fn(() => Promise.resolve([{ 1: 1 }]));

      const isHealthy = await databaseManager.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      await databaseManager.init();
      databaseManager['db'].getAllAsync = jest.fn(() => 
        Promise.reject(new Error('Database error'))
      );

      const isHealthy = await databaseManager.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Database Statistics', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should return database statistics', async () => {
      databaseManager['db'].getAllAsync = jest.fn(() => 
        Promise.resolve([{ count: 5 }])
      );

      const stats = await databaseManager.getStats();

      expect(stats).toHaveProperty('tables');
      expect(stats).toHaveProperty('dbSize');
      expect(stats.tables).toHaveProperty('user_profile');
    });
  });

  describe('Export and Import', () => {
    beforeEach(async () => {
      await databaseManager.init();
    });

    it('should export data as JSON', async () => {
      databaseManager['db'].getAllAsync = jest.fn(() => Promise.resolve([]));

      const exportData = await databaseManager.export();
      const parsed = JSON.parse(exportData);

      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('data');
    });

    it('should import data from JSON', async () => {
      const importData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          user_profile: [{ id: 1, name: 'Test' }],
        },
      };

      await databaseManager.import(JSON.stringify(importData));

      expect(databaseManager['db'].withTransactionAsync).toHaveBeenCalled();
    });

    it('should reject invalid import data', async () => {
      const invalidData = JSON.stringify({ invalid: true });

      await expect(databaseManager.import(invalidData)).rejects.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should close database connection', async () => {
      await databaseManager.init();
      await databaseManager.close();

      expect(databaseManager['db']).toBeNull();
      expect(databaseManager['isInitialized']).toBe(false);
    });
  });
});
