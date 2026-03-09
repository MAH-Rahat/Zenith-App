import { File, Paths } from 'expo-file-system';
import { databaseManager as DatabaseManager } from './DatabaseManager';

/**
 * StorageManager Service
 * 
 * Handles backup export/import operations for the Zenith app.
 * Wraps DatabaseManager export functionality and manages file system operations.
 * 
 * Requirements:
 * - 2.1: Export all 10 SQLite tables to a single JSON file
 * - 2.2: Generate timestamped filename in format zenith_backup_YYYYMMDD_HHMMSS.json
 * - 2.3: Write JSON file to device's documents directory
 * - 2.4: Import JSON files matching the export schema
 * - 2.5: Validate JSON structure before writing to SQLite
 * - 2.6: Display specific error messages and preserve existing data if validation fails
 */

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  details?: string;
}

class StorageManagerImpl {
  /**
   * Export all database tables to a timestamped JSON file
   * 
   * @returns ExportResult with file path and name on success, or error message on failure
   */
  async exportAllTables(): Promise<ExportResult> {
    try {
      // Get JSON data from DatabaseManager
      const jsonData = await DatabaseManager.export();

      // Generate timestamped filename: zenith_backup_YYYYMMDD_HHMMSS.json
      const timestamp = this.generateTimestamp();
      const fileName = `zenith_backup_${timestamp}.json`;

      // Create file in documents directory
      const file = new File(Paths.document, fileName);
      
      // Write JSON data to file
      await file.write(jsonData);

      return {
        success: true,
        filePath: file.uri,
        fileName,
      };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Import data from a JSON backup file
   * 
   * Requirements:
   * - 2.4: Import JSON files matching the export schema
   * - 2.5: Validate JSON structure before writing to SQLite
   * - 2.6: Display specific error messages and preserve existing data if validation fails
   * 
   * @param filePath Path to the JSON backup file
   * @returns ImportResult with success status and error details if validation fails
   */
  async importFromJSON(filePath: string): Promise<ImportResult> {
    try {
      // Read JSON file from device
      const file = new File(filePath);
      const fileContent = await file.text();

      // Validate JSON structure before importing
      const validationResult = this.validateBackupJSON(fileContent);
      if (!validationResult.isValid) {
        // Preserve existing data by not calling DatabaseManager.import()
        return {
          success: false,
          error: validationResult.error,
          details: validationResult.details,
        };
      }

      // Import validated data using DatabaseManager
      await DatabaseManager.import(fileContent);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Import failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unknown error occurred';
      let details = '';

      if (error instanceof Error) {
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          errorMessage = 'File not found';
          details = 'The specified backup file does not exist or cannot be accessed.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Invalid JSON format';
          details = 'The file contains malformed JSON data.';
        } else if (error.message.includes('database') || error.message.includes('SQLite')) {
          errorMessage = 'Database import failed';
          details = 'Failed to write data to the database. Your existing data has been preserved.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        details,
      };
    }
  }

  /**
   * Validate backup JSON structure
   * 
   * Checks:
   * - Valid JSON format
   * - Required top-level fields (version, timestamp, data)
   * - All 10 required tables present
   * - Each table is an array
   * 
   * @param jsonString JSON string to validate
   * @returns Validation result with error details if invalid
   */
  private validateBackupJSON(jsonString: string): {
    isValid: boolean;
    error?: string;
    details?: string;
  } {
    try {
      // Parse JSON
      const data = JSON.parse(jsonString);

      // Check required top-level fields
      if (!data.version) {
        return {
          isValid: false,
          error: 'Missing version field',
          details: 'The backup file is missing the required "version" field.',
        };
      }

      if (!data.timestamp) {
        return {
          isValid: false,
          error: 'Missing timestamp field',
          details: 'The backup file is missing the required "timestamp" field.',
        };
      }

      if (!data.data || typeof data.data !== 'object') {
        return {
          isValid: false,
          error: 'Missing or invalid data field',
          details: 'The backup file is missing the required "data" field or it is not an object.',
        };
      }

      // Check all 10 required tables are present
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

      const missingTables = requiredTables.filter(
        table => !data.data.hasOwnProperty(table)
      );

      if (missingTables.length > 0) {
        return {
          isValid: false,
          error: 'Missing required tables',
          details: `The backup file is missing the following tables: ${missingTables.join(', ')}`,
        };
      }

      // Validate each table is an array
      for (const table of requiredTables) {
        if (!Array.isArray(data.data[table])) {
          return {
            isValid: false,
            error: `Invalid table format: ${table}`,
            details: `The "${table}" table must be an array.`,
          };
        }
      }

      // All validations passed
      return {
        isValid: true,
      };
    } catch (error) {
      // JSON parsing failed
      return {
        isValid: false,
        error: 'Invalid JSON format',
        details: error instanceof Error ? error.message : 'Failed to parse JSON data.',
      };
    }
  }

  /**
   * Generate timestamp in format YYYYMMDD_HHMMSS
   * 
   * @returns Formatted timestamp string
   */
  private generateTimestamp(): string {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }
}

// Export singleton instance
const StorageManager = new StorageManagerImpl();
export default StorageManager;
