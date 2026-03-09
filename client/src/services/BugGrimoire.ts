import { databaseManager } from './DatabaseManager';

export interface BugEntry {
  id: string;
  errorCode: string;
  solution: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const AVAILABLE_TAGS = [
  'React',
  'MongoDB',
  'Node',
  'Express',
  'Docker',
  'Python',
  'Linux',
  'TypeScript',
  'JavaScript',
  'SQL',
  'Git',
  'Other'
];

class BugGrimoireImpl {
  /**
   * Create a new bug entry
   */
  async createEntry(errorCode: string, solution: string, tags: string[]): Promise<string> {
    try {
      if (tags.length === 0) {
        throw new Error('At least one tag is required');
      }

      const id = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await databaseManager.insert('bug_grimoire', {
        id,
        error_code: errorCode,
        solution,
        tags: JSON.stringify(tags),
        created_at: now,
        updated_at: now
      });

      console.log(`Bug entry created: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to create bug entry:', error);
      throw new Error('Failed to create bug entry');
    }
  }

  /**
   * Update an existing bug entry
   */
  async updateEntry(entryId: string, data: Partial<BugEntry>): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (data.errorCode !== undefined) {
        updateData.error_code = data.errorCode;
      }

      if (data.solution !== undefined) {
        updateData.solution = data.solution;
      }

      if (data.tags !== undefined) {
        if (data.tags.length === 0) {
          throw new Error('At least one tag is required');
        }
        updateData.tags = JSON.stringify(data.tags);
      }

      await databaseManager.update(
        'bug_grimoire',
        updateData,
        'id = ?',
        [entryId]
      );

      console.log(`Bug entry updated: ${entryId}`);
    } catch (error) {
      console.error('Failed to update bug entry:', error);
      throw new Error('Failed to update bug entry');
    }
  }

  /**
   * Delete a bug entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    try {
      await databaseManager.delete('bug_grimoire', 'id = ?', [entryId]);
      console.log(`Bug entry deleted: ${entryId}`);
    } catch (error) {
      console.error('Failed to delete bug entry:', error);
      throw new Error('Failed to delete bug entry');
    }
  }

  /**
   * Search entries by keyword
   */
  async searchEntries(keyword: string): Promise<BugEntry[]> {
    try {
      const searchTerm = `%${keyword}%`;
      const entries = await databaseManager.query<any>(
        `SELECT * FROM bug_grimoire 
         WHERE error_code LIKE ? OR solution LIKE ?
         ORDER BY created_at DESC`,
        [searchTerm, searchTerm]
      );

      return this.mapEntries(entries);
    } catch (error) {
      console.error('Failed to search bug entries:', error);
      return [];
    }
  }

  /**
   * Filter entries by tags (ALL selected tags must match)
   */
  async filterByTags(tags: string[]): Promise<BugEntry[]> {
    try {
      if (tags.length === 0) {
        return this.getAllEntries();
      }

      // Get all entries and filter in memory (SQLite doesn't have good JSON array support)
      const allEntries = await this.getAllEntries();
      
      // Filter entries that contain ALL selected tags
      return allEntries.filter(entry => 
        tags.every(tag => entry.tags.includes(tag))
      );
    } catch (error) {
      console.error('Failed to filter bug entries by tags:', error);
      return [];
    }
  }

  /**
   * Get all bug entries
   */
  async getAllEntries(): Promise<BugEntry[]> {
    try {
      const entries = await databaseManager.query<any>(
        'SELECT * FROM bug_grimoire ORDER BY created_at DESC'
      );

      return this.mapEntries(entries);
    } catch (error) {
      console.error('Failed to get all bug entries:', error);
      return [];
    }
  }

  /**
   * Get a single entry by ID
   */
  async getEntry(entryId: string): Promise<BugEntry | null> {
    try {
      const entries = await databaseManager.query<any>(
        'SELECT * FROM bug_grimoire WHERE id = ?',
        [entryId]
      );

      if (entries.length === 0) {
        return null;
      }

      return this.mapEntries(entries)[0];
    } catch (error) {
      console.error('Failed to get bug entry:', error);
      return null;
    }
  }

  /**
   * Map database rows to BugEntry objects
   */
  private mapEntries(rows: any[]): BugEntry[] {
    return rows.map(row => ({
      id: row.id,
      errorCode: row.error_code,
      solution: row.solution,
      tags: JSON.parse(row.tags),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

// Singleton instance
export const bugGrimoire = new BugGrimoireImpl();
