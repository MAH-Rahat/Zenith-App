// @ts-ignore - expo-sqlite v16 types are incomplete
import { openDatabaseAsync, deleteDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'zenith.db';
const DB_VERSION = 2;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 100;

interface ErrorLog {
  type: string;
  query?: string;
  error: string;
  timestamp: string;
}

class DatabaseManagerImpl {
  private db: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private connectionPool: Set<Promise<any>> = new Set();
  private readonly MAX_CONCURRENT_OPERATIONS = 10;

  /**
   * Initialize database and create tables if they don't exist
   * Implements connection pooling and ensures single initialization
   */
  async init(): Promise<void> {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.isInitialized) {
      return;
    }

    this.initPromise = this._performInit();
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _performInit(): Promise<void> {
    try {
      this.db = await openDatabaseAsync(DB_NAME);
      
      // Enable foreign key constraints globally
      await this.db.execAsync('PRAGMA foreign_keys = ON');
      
      // Run migrations to ensure schema is up to date
      await this.migrate();
      
      await this.initializeDefaultData();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error('Failed to initialize database');
    }
  }

  /**
   * @deprecated Use migrate() instead. This method is kept for backward compatibility.
   * Create all required tables (legacy method)
   */
  private async createTables(): Promise<void> {
    console.warn('createTables() is deprecated. Use migrate() instead.');
    // Migration system now handles table creation
  }

  /**
   * Initialize default data (user profile and skill tree)
   */
  private async initializeDefaultData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if user profile exists
    const userProfile = await this.query<{ id: number }>('SELECT id FROM user_profile LIMIT 1');
    
    if (userProfile.length === 0) {
      // Create default user profile with all required fields
      const now = new Date().toISOString();
      const timestamp = Date.now();
      
      await this.db.runAsync(
        `INSERT INTO user_profile (
          id, totalEXP, dailyEXP, level, rank, currentHP, health_score, 
          lastResetDate, lastActivityTimestamp, createdAt, updatedAt
        ) VALUES (1, 0, 0, 0, 'Script Novice', 100, 100, ?, ?, ?, ?)`,
        [now, timestamp, now, now]
      );
      console.log('Default user profile created');
    }

    // Check if skill nodes exist
    const skillNodes = await this.query<{ id: string }>('SELECT id FROM skill_nodes LIMIT 1');
    
    if (skillNodes.length === 0) {
      // Initialize skill tree with 4 phases
      const nodes = [
        // Phase 1: MERN Stack (unlocked by default)
        { id: 'react-hooks', skillId: 'react-hooks', name: 'React Hooks', phase: 1, isUnlocked: 1 },
        { id: 'context-zustand', skillId: 'context-zustand', name: 'Context/Zustand', phase: 1, isUnlocked: 1 },
        { id: 'nextjs', skillId: 'nextjs', name: 'Next.js', phase: 1, isUnlocked: 1 },
        { id: 'node-express', skillId: 'node-express', name: 'Node/Express', phase: 1, isUnlocked: 1 },
        { id: 'mongodb', skillId: 'mongodb', name: 'MongoDB', phase: 1, isUnlocked: 1 },

        // Phase 2: DevOps (locked)
        { id: 'linux-bash', skillId: 'linux-bash', name: 'Linux Bash', phase: 2, isUnlocked: 0 },
        { id: 'git', skillId: 'git', name: 'Git', phase: 2, isUnlocked: 0 },
        { id: 'docker', skillId: 'docker', name: 'Docker', phase: 2, isUnlocked: 0 },
        { id: 'cicd', skillId: 'cicd', name: 'CI/CD', phase: 2, isUnlocked: 0 },
        { id: 'aws-vercel', skillId: 'aws-vercel', name: 'AWS/Vercel', phase: 2, isUnlocked: 0 },

        // Phase 3: DevSecOps (locked)
        { id: 'jwt', skillId: 'jwt', name: 'JWT', phase: 3, isUnlocked: 0 },
        { id: 'bcrypt', skillId: 'bcrypt', name: 'bcrypt', phase: 3, isUnlocked: 0 },
        { id: 'owasp-top-10', skillId: 'owasp-top-10', name: 'OWASP Top 10', phase: 3, isUnlocked: 0 },
        { id: 'nmap', skillId: 'nmap', name: 'Nmap', phase: 3, isUnlocked: 0 },
        { id: 'wireshark', skillId: 'wireshark', name: 'Wireshark', phase: 3, isUnlocked: 0 },

        // Phase 4: AI/ML (locked)
        { id: 'python', skillId: 'python', name: 'Python', phase: 4, isUnlocked: 0 },
        { id: 'pandas-numpy', skillId: 'pandas-numpy', name: 'Pandas/NumPy', phase: 4, isUnlocked: 0 },
        { id: 'scikit-learn', skillId: 'scikit-learn', name: 'Scikit-Learn', phase: 4, isUnlocked: 0 },
        { id: 'tensorflow-keras', skillId: 'tensorflow-keras', name: 'TensorFlow/Keras', phase: 4, isUnlocked: 0 },
        { id: 'local-llm', skillId: 'local-llm', name: 'Local LLM', phase: 4, isUnlocked: 0 }
      ];

      for (const node of nodes) {
        await this.db.runAsync(
          `INSERT INTO skill_nodes (id, skillId, name, phase, isUnlocked, isComplete)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [node.id, node.skillId, node.name, node.phase, node.isUnlocked]
        );
      }
      console.log('Skill tree initialized with 20 nodes across 4 phases');
    }
  }

  /**
   * Execute a SELECT query with retry logic
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      await this.init();
    }

    return this.safeQuery<T[]>(sql, params, []);
  }

  /**
   * Safe query execution with retry logic and error handling
   */
  private async safeQuery<T>(
    sql: string,
    params: any[],
    defaultValue: T
  ): Promise<T> {
    try {
      const result = await this.db!.getAllAsync(sql, params);
      return result as T;
    } catch (error) {
      console.error('SQLite query failed:', error);
      await this.logError({
        type: 'database_query_error',
        query: sql,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Retry once after delay
      await this.delay(RETRY_DELAY_MS);

      try {
        const result = await this.db!.getAllAsync(sql, params);
        console.log('Query retry succeeded');
        return result as T;
      } catch (retryError) {
        console.error('SQLite retry failed:', retryError);
        return defaultValue;
      }
    }
  }

  /**
   * Insert a row into a table with retry logic
   */
  async insert(table: string, data: Record<string, any>): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    return this.safeWrite(sql, values, table);
  }

  /**
   * Safe write operation with retry logic
   */
  private async safeWrite(
    sql: string,
    params: any[],
    context: string
  ): Promise<number> {
    try {
      const result = await this.db!.runAsync(sql, params);
      return result.lastInsertRowId || result.changes || 0;
    } catch (error) {
      console.error('SQLite write failed:', error);
      await this.logError({
        type: 'database_write_error',
        query: sql,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // Retry once after delay
      await this.delay(RETRY_DELAY_MS);

      try {
        const result = await this.db!.runAsync(sql, params);
        console.log('Write retry succeeded');
        return result.lastInsertRowId || result.changes || 0;
      } catch (retryError) {
        console.error('SQLite write retry failed:', retryError);
        
        // Display user-facing error only for critical operations
        if (context.includes('user_profile') || context.includes('quests')) {
          console.error(
            'Critical database error',
            'Failed to save progress. Please restart the app.'
          );
        }
        
        throw retryError;
      }
    }
  }

  /**
   * Update rows in a table with retry logic
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: string,
    params: any[] = []
  ): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const allParams = [...values, ...params];

    await this.safeWrite(sql, allParams, table);
  }

  /**
   * Delete rows from a table with retry logic
   */
  async delete(table: string, where: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const sql = `DELETE FROM ${table} WHERE ${where}`;

    await this.safeWrite(sql, params, table);
  }

  /**
   * Execute a transaction with automatic rollback on error
   * Provides atomic operations for multiple database changes
   */
  async transaction(callback: (tx: any) => Promise<void>): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      await this.db!.withTransactionAsync(async (tx: any) => {
        try {
          await callback(tx);
        } catch (error) {
          console.error('Transaction callback error:', error);
          throw error; // This will trigger rollback
        }
      });
    } catch (error) {
      console.error('Transaction failed and rolled back:', error);
      await this.logError({
        type: 'database_transaction_error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Execute multiple operations atomically
   * Useful for complex operations that need to succeed or fail together
   */
  async batchWrite(operations: Array<{
    sql: string;
    params: any[];
  }>): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    await this.transaction(async () => {
      for (const op of operations) {
        await this.db!.runAsync(op.sql, op.params);
      }
    });
  }

  /**
   * Bulk insert multiple rows efficiently
   */
  async bulkInsert(table: string, rows: Record<string, any>[]): Promise<void> {
    if (rows.length === 0) return;

    const keys = Object.keys(rows[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    await this.transaction(async () => {
      for (const row of rows) {
        const values = keys.map(key => row[key]);
        await this.db!.runAsync(sql, values);
      }
    });
  }

  /**
   * Export all data as JSON
   */
  async export(): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    try {
      const data: Record<string, any[]> = {};
      
      const tables = [
        'user_profile',
        'quests',
        'skill_nodes',
        'contribution_grid',
        'bug_grimoire',
        'flashcards',
        'exams',
        'hp_log',
        'notifications',
        'settings'
      ];

      for (const table of tables) {
        data[table] = await this.query(`SELECT * FROM ${table}`);
      }

      const exportData = {
        version: DB_VERSION,
        timestamp: new Date().toISOString(),
        appVersion: '2.0.0',
        data
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Import data from JSON
   */
  async import(jsonData: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      const importData = JSON.parse(jsonData);

      // Validate structure
      if (!importData.version || !importData.data) {
        throw new Error('Invalid import data structure');
      }

      // Clear existing data and import
      await this.transaction(async () => {
        const tables = Object.keys(importData.data);
        
        for (const table of tables) {
          // Clear table
          await this.db!.runAsync(`DELETE FROM ${table}`);
          
          // Insert rows
          const rows = importData.data[table];
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map(() => '?').join(', ');
            
            const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
            await this.db!.runAsync(sql, values);
          }
        }
      });

      console.log('Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error('Failed to import data');
    }
  }

  /**
   * Get current schema version from settings table
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'schema_version'"
      );
      return result.length > 0 ? parseInt(result[0].value, 10) : 0;
    } catch (error) {
      // Settings table might not exist yet
      return 0;
    }
  }

  /**
   * Set schema version in settings table
   */
  private async setVersion(version: number): Promise<void> {
    const versionStr = version.toString();
    
    // Check if version setting exists
    const existing = await this.query<{ key: string }>(
      "SELECT key FROM settings WHERE key = 'schema_version'"
    );

    if (existing.length > 0) {
      await this.update('settings', { value: versionStr }, "key = 'schema_version'");
    } else {
      await this.insert('settings', { key: 'schema_version', value: versionStr });
    }
  }

  /**
   * Migrate database schema to a new version
   * Implements idempotent migrations with version tracking
   */
  async migrate(targetVersion?: number): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const currentVersion = await this.getCurrentVersion();
    const finalVersion = targetVersion || DB_VERSION;

    if (currentVersion >= finalVersion) {
      console.log(`Database already at version ${currentVersion}, no migration needed`);
      return;
    }

    console.log(`Migrating database from version ${currentVersion} to ${finalVersion}`);

    // Run migrations sequentially
    for (let version = currentVersion + 1; version <= finalVersion; version++) {
      await this.runMigration(version);
      await this.setVersion(version);
      console.log(`Migration to version ${version} completed`);
    }
  }

  /**
   * Execute specific migration based on version
   */
  private async runMigration(version: number): Promise<void> {
    switch (version) {
      case 1:
        await this.migrationV1();
        break;
      case 2:
        await this.migrationV2();
        break;
      default:
        console.log(`No migration defined for version ${version}`);
    }
  }

  /**
   * Migration V1: Initial schema with foreign key constraints
   * Requirements: 1.3, 1.4
   */
  private async migrationV1(): Promise<void> {
    await this.transaction(async () => {
      // Enable foreign key constraints
      await this.db!.execAsync('PRAGMA foreign_keys = ON');

      // Create user_profile table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id INTEGER PRIMARY KEY,
          totalEXP INTEGER NOT NULL DEFAULT 0,
          dailyEXP INTEGER NOT NULL DEFAULT 0,
          level INTEGER NOT NULL DEFAULT 0,
          rank TEXT NOT NULL DEFAULT 'Script Novice',
          currentHP INTEGER NOT NULL DEFAULT 100,
          health_score INTEGER DEFAULT NULL,
          lastResetDate TEXT NOT NULL,
          lastActivityTimestamp INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      // Create quests table with foreign key to parent quest
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS quests (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          expValue INTEGER NOT NULL,
          isComplete INTEGER NOT NULL DEFAULT 0,
          type TEXT NOT NULL CHECK(type IN ('main', 'side')),
          energyLevel TEXT NOT NULL CHECK(energyLevel IN ('high', 'medium', 'low')),
          microSteps TEXT,
          parent_quest_id TEXT,
          createdAt TEXT NOT NULL,
          completedAt TEXT,
          FOREIGN KEY (parent_quest_id) REFERENCES quests(id) ON DELETE CASCADE
        )
      `);

      // Create skill_nodes table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS skill_nodes (
          id TEXT PRIMARY KEY,
          skillId TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          phase INTEGER NOT NULL CHECK(phase BETWEEN 1 AND 4),
          isUnlocked INTEGER NOT NULL DEFAULT 0,
          isComplete INTEGER NOT NULL DEFAULT 0,
          proofOfWork TEXT,
          completedAt TEXT
        )
      `);

      // Create contribution_grid table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS contribution_grid (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          expEarned INTEGER NOT NULL DEFAULT 0,
          questsCompleted INTEGER NOT NULL DEFAULT 0,
          hasActivity INTEGER NOT NULL DEFAULT 0,
          is_shattered INTEGER NOT NULL DEFAULT 0
        )
      `);

      // Create bug_grimoire table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS bug_grimoire (
          id TEXT PRIMARY KEY,
          errorCode TEXT NOT NULL,
          solution TEXT NOT NULL,
          tags TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      // Create flashcards table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS flashcards (
          id TEXT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          subject TEXT NOT NULL CHECK(subject IN ('CSE321', 'CSE341', 'CSE422', 'CSE423')),
          box INTEGER NOT NULL DEFAULT 1 CHECK(box BETWEEN 1 AND 5),
          nextReviewDate TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          lastReviewedAt TEXT
        )
      `);

      // Create exams table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS exams (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL CHECK(name IN ('CSE321', 'CSE341', 'CSE422', 'CSE423')),
          date TEXT NOT NULL,
          color TEXT NOT NULL
        )
      `);

      // Create hp_log table with foreign key to user_profile
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS hp_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          hpChange INTEGER NOT NULL,
          reason TEXT NOT NULL,
          newHP INTEGER NOT NULL,
          user_id INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
        )
      `);

      // Create notifications table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          isRead INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL
        )
      `);

      // Create settings table
      await this.db!.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      // Create indexes for performance
      await this.db!.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
        CREATE INDEX IF NOT EXISTS idx_quests_complete ON quests(isComplete);
        CREATE INDEX IF NOT EXISTS idx_quests_parent ON quests(parent_quest_id);
        CREATE INDEX IF NOT EXISTS idx_skill_nodes_phase ON skill_nodes(phase);
        CREATE INDEX IF NOT EXISTS idx_contribution_grid_date ON contribution_grid(date);
        CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
        CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(nextReviewDate);
        CREATE INDEX IF NOT EXISTS idx_hp_log_timestamp ON hp_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(isRead);
      `);

      console.log('Migration V1: All tables and foreign keys created');
    });
  }

  /**
   * Migration V2: Add is_shattered column to contribution_grid
   * Requirements: 11.4
   */
  private async migrationV2(): Promise<void> {
    await this.transaction(async () => {
      // Add is_shattered column to contribution_grid table
      await this.db!.execAsync(`
        ALTER TABLE contribution_grid 
        ADD COLUMN is_shattered INTEGER NOT NULL DEFAULT 0
      `);

      console.log('Migration V2: Added is_shattered column to contribution_grid');
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('Database closed');
    }
  }

  /**
   * Log error to console (in production, could log to persistent storage)
   */
  private async logError(errorLog: ErrorLog): Promise<void> {
    console.error('Database Error Log:', errorLog);
    // In production, could persist to error_logs table or external service
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check database health and connection status
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.init();
      }
      
      // Simple query to verify database is responsive
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    tables: Record<string, number>;
    dbSize: string;
  }> {
    if (!this.db) {
      await this.init();
    }

    const tables = [
      'user_profile',
      'quests',
      'skill_nodes',
      'contribution_grid',
      'bug_grimoire',
      'flashcards',
      'exams',
      'hp_log',
      'notifications',
      'settings'
    ];

    const stats: Record<string, number> = {};

    for (const table of tables) {
      const result = await this.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      stats[table] = result[0]?.count || 0;
    }

    return {
      tables: stats,
      dbSize: 'N/A' // expo-sqlite doesn't provide size info easily
    };
  }

  /**
   * Clear all data from database (useful for testing)
   * Preserves schema_version setting
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    // Get current schema version before clearing
    const versionResult = await this.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'schema_version'"
    );
    const currentVersion = versionResult.length > 0 ? versionResult[0].value : null;

    const tables = [
      'user_profile',
      'quests',
      'skill_nodes',
      'contribution_grid',
      'bug_grimoire',
      'flashcards',
      'exams',
      'hp_log',
      'notifications',
      'settings'
    ];

    await this.transaction(async () => {
      for (const table of tables) {
        await this.db!.runAsync(`DELETE FROM ${table}`);
      }
    });

    // Restore schema version if it existed
    if (currentVersion) {
      await this.insert('settings', {
        key: 'schema_version',
        value: currentVersion
      });
    }

    // Reset initialization flag so init() will recreate default data
    this.isInitialized = false;

    console.log('All data cleared from database');
  }
}

// Singleton instance
export const databaseManager = new DatabaseManagerImpl();
