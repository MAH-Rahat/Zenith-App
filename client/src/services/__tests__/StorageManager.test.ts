import StorageManager from '../StorageManager';
import { databaseManager as DatabaseManager } from '../DatabaseManager';
import { File, Paths } from 'expo-file-system';

// Create mock file instance at module level
const mockFile = {
  uri: 'file:///mock/documents/test.json',
  write: jest.fn(),
  text: jest.fn(),
};

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockFile),
  Paths: {
    document: { uri: 'file:///mock/documents/' },
  },
}));

// Mock DatabaseManager
jest.mock('../DatabaseManager', () => ({
  databaseManager: {
    export: jest.fn(),
    import: jest.fn(),
  },
}));

describe('StorageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFile.write.mockResolvedValue(undefined);
    mockFile.text.mockResolvedValue('');
  });

  describe('exportAllTables', () => {
    it('should export all tables to a timestamped JSON file', async () => {
      // Arrange
      const mockJsonData = JSON.stringify({
        version: 1,
        timestamp: '2024-01-15T10:30:00.000Z',
        appVersion: '2.0.0',
        data: {
          user_profile: [],
          quests: [],
          skill_nodes: [],
          contribution_grid: [],
          bug_grimoire: [],
          flashcards: [],
          exams: [],
          hp_log: [],
          notifications: [],
          settings: [],
        },
      });

      (DatabaseManager.export as jest.Mock).mockResolvedValue(mockJsonData);

      // Act
      const result = await StorageManager.exportAllTables();

      // Assert
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/^zenith_backup_\d{8}_\d{6}\.json$/);
      expect(result.filePath).toBe(mockFile.uri);
      expect(DatabaseManager.export).toHaveBeenCalledTimes(1);
      expect(mockFile.write).toHaveBeenCalledWith(mockJsonData);
    });

    it('should generate filename with correct timestamp format', async () => {
      // Arrange
      const mockJsonData = JSON.stringify({ data: {} });
      (DatabaseManager.export as jest.Mock).mockResolvedValue(mockJsonData);

      // Act
      const result = await StorageManager.exportAllTables();

      // Assert
      expect(result.success).toBe(true);
      // Verify filename matches the expected pattern with timestamp
      expect(result.fileName).toMatch(/^zenith_backup_\d{8}_\d{6}\.json$/);
      
      // Verify the timestamp format is correct (YYYYMMDD_HHMMSS)
      const timestampPart = result.fileName!.replace('zenith_backup_', '').replace('.json', '');
      const [datePart, timePart] = timestampPart.split('_');
      expect(datePart).toHaveLength(8); // YYYYMMDD
      expect(timePart).toHaveLength(6); // HHMMSS
    });

    it('should handle DatabaseManager export failure', async () => {
      // Arrange
      const errorMessage = 'Database export failed';
      (DatabaseManager.export as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      const result = await StorageManager.exportAllTables();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(mockFile.write).not.toHaveBeenCalled();
    });

    it('should handle file system write failure', async () => {
      // Arrange
      const mockJsonData = JSON.stringify({ data: {} });
      (DatabaseManager.export as jest.Mock).mockResolvedValue(mockJsonData);
      mockFile.write.mockRejectedValue(new Error('Write permission denied'));

      // Act
      const result = await StorageManager.exportAllTables();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Write permission denied');
      expect(result.filePath).toBeUndefined();
      expect(result.fileName).toBeUndefined();
    });

    it('should create unique filenames for consecutive exports', async () => {
      // Arrange
      const mockJsonData = JSON.stringify({ data: {} });
      (DatabaseManager.export as jest.Mock).mockResolvedValue(mockJsonData);

      // Act
      const result1 = await StorageManager.exportAllTables();
      
      // Wait 1 second to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result2 = await StorageManager.exportAllTables();

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.fileName).not.toBe(result2.fileName);
    });
  });

  describe('importFromJSON', () => {
    const validBackupData = {
      version: 1,
      timestamp: '2024-01-15T10:30:00.000Z',
      appVersion: '2.0.0',
      data: {
        user_profile: [{ id: 1, totalEXP: 100 }],
        quests: [],
        skill_nodes: [],
        contribution_grid: [],
        bug_grimoire: [],
        flashcards: [],
        exams: [],
        hp_log: [],
        notifications: [],
        settings: [],
      },
    };

    it('should successfully import valid backup JSON', async () => {
      // Arrange
      const mockJsonString = JSON.stringify(validBackupData);
      mockFile.text.mockResolvedValue(mockJsonString);
      (DatabaseManager.import as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFile.text).toHaveBeenCalledTimes(1);
      expect(DatabaseManager.import).toHaveBeenCalledWith(mockJsonString);
    });

    it('should reject import when version field is missing', async () => {
      // Arrange
      const invalidData = { ...validBackupData };
      delete (invalidData as any).version;
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing version field');
      expect(result.details).toContain('version');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should reject import when timestamp field is missing', async () => {
      // Arrange
      const invalidData = { ...validBackupData };
      delete (invalidData as any).timestamp;
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing timestamp field');
      expect(result.details).toContain('timestamp');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should reject import when data field is missing', async () => {
      // Arrange
      const invalidData = { version: 1, timestamp: '2024-01-15T10:30:00.000Z' };
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing or invalid data field');
      expect(result.details).toContain('data');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should reject import when required tables are missing', async () => {
      // Arrange
      const invalidData = {
        version: 1,
        timestamp: '2024-01-15T10:30:00.000Z',
        data: {
          user_profile: [],
          quests: [],
          // Missing other required tables
        },
      };
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required tables');
      expect(result.details).toContain('skill_nodes');
      expect(result.details).toContain('contribution_grid');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should reject import when a table is not an array', async () => {
      // Arrange
      const invalidData = {
        ...validBackupData,
        data: {
          ...validBackupData.data,
          quests: 'not an array', // Invalid: should be array
        },
      };
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid table format: quests');
      expect(result.details).toContain('array');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should reject import with malformed JSON', async () => {
      // Arrange
      mockFile.text.mockResolvedValue('{ invalid json }');

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON format');
      expect(result.details).toBeDefined();
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should handle file not found error', async () => {
      // Arrange
      mockFile.text.mockRejectedValue(new Error('ENOENT: file not found'));

      // Act
      const result = await StorageManager.importFromJSON('file:///nonexistent.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(result.details).toContain('does not exist');
      expect(DatabaseManager.import).not.toHaveBeenCalled();
    });

    it('should handle database import failure', async () => {
      // Arrange
      const mockJsonString = JSON.stringify(validBackupData);
      mockFile.text.mockResolvedValue(mockJsonString);
      (DatabaseManager.import as jest.Mock).mockRejectedValue(
        new Error('SQLite database error')
      );

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database import failed');
      expect(result.details).toContain('existing data has been preserved');
    });

    it('should preserve existing data when validation fails', async () => {
      // Arrange
      const invalidData = { version: 1 }; // Missing required fields
      mockFile.text.mockResolvedValue(JSON.stringify(invalidData));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(DatabaseManager.import).not.toHaveBeenCalled();
      // Verify that DatabaseManager.import was never called, meaning existing data is preserved
    });

    it('should validate all 10 required tables are present', async () => {
      // Arrange
      const requiredTables = [
        'user_profile',
        'quests',
        'skill_nodes',
        'contribution_grid',
        'bug_grimoire',
        'flashcards',
        'exams',
        'hp_log',
        'notifications',
        'settings',
      ];

      const completeData = {
        version: 1,
        timestamp: '2024-01-15T10:30:00.000Z',
        data: Object.fromEntries(requiredTables.map(table => [table, []])),
      };

      mockFile.text.mockResolvedValue(JSON.stringify(completeData));
      (DatabaseManager.import as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(true);
      expect(DatabaseManager.import).toHaveBeenCalledTimes(1);
    });

    it('should provide specific error for each missing table', async () => {
      // Arrange
      const dataWithMissingTable = {
        version: 1,
        timestamp: '2024-01-15T10:30:00.000Z',
        data: {
          user_profile: [],
          quests: [],
          skill_nodes: [],
          contribution_grid: [],
          bug_grimoire: [],
          flashcards: [],
          exams: [],
          hp_log: [],
          notifications: [],
          // Missing 'settings' table
        },
      };

      mockFile.text.mockResolvedValue(JSON.stringify(dataWithMissingTable));

      // Act
      const result = await StorageManager.importFromJSON('file:///mock/backup.json');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required tables');
      expect(result.details).toContain('settings');
    });
  });
});
