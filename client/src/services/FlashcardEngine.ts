import { databaseManager } from './DatabaseManager';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  subject: string;
  boxNumber: number;
  nextReviewDate: string;
  createdAt: string;
  lastReviewedAt?: string;
}

export const SUBJECT_CODES = ['CSE321', 'CSE341', 'CSE422', 'CSE423', 'Other'];

// Leitner system intervals (in days)
const BOX_INTERVALS: Record<number, number> = {
  1: 1,   // Box 1: Review after 1 day
  2: 3,   // Box 2: Review after 3 days
  3: 7,   // Box 3: Review after 7 days
  4: 14,  // Box 4: Review after 14 days
  5: 30   // Box 5: Review after 30 days
};

class FlashcardEngineImpl {
  /**
   * Create a new flashcard
   */
  async createCard(question: string, answer: string, subject: string): Promise<string> {
    try {
      const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await databaseManager.insert('flashcards', {
        id,
        question,
        answer,
        subject,
        box: 1,
        nextReviewDate: now, // Available for review immediately
        createdAt: now,
        lastReviewedAt: null
      });

      console.log(`Flashcard created: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      throw new Error('Failed to create flashcard');
    }
  }

  /**
   * Update an existing flashcard
   */
  async updateCard(cardId: string, data: Partial<Flashcard>): Promise<void> {
    try {
      const updateData: Record<string, any> = {};

      if (data.question !== undefined) updateData.question = data.question;
      if (data.answer !== undefined) updateData.answer = data.answer;
      if (data.subject !== undefined) updateData.subject = data.subject;

      if (Object.keys(updateData).length > 0) {
        await databaseManager.update(
          'flashcards',
          updateData,
          'id = ?',
          [cardId]
        );

        console.log(`Flashcard updated: ${cardId}`);
      }
    } catch (error) {
      console.error('Failed to update flashcard:', error);
      throw new Error('Failed to update flashcard');
    }
  }

  /**
   * Delete a flashcard
   */
  async deleteCard(cardId: string): Promise<void> {
    try {
      await databaseManager.delete('flashcards', 'id = ?', [cardId]);
      console.log(`Flashcard deleted: ${cardId}`);
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
      throw new Error('Failed to delete flashcard');
    }
  }

  /**
   * Review a flashcard (correct answer)
   */
  async reviewCardCorrect(cardId: string): Promise<void> {
    try {
      const cards = await databaseManager.query<any>(
        'SELECT box FROM flashcards WHERE id = ?',
        [cardId]
      );

      if (cards.length === 0) {
        throw new Error('Flashcard not found');
      }

      const currentBox = cards[0].box;
      const newBox = Math.min(5, currentBox + 1); // Move to next box, max 5
      const nextReviewDate = this.calculateNextReviewDate(newBox);

      await databaseManager.update(
        'flashcards',
        {
          box: newBox,
          nextReviewDate: nextReviewDate,
          lastReviewedAt: new Date().toISOString()
        },
        'id = ?',
        [cardId]
      );

      console.log(`Flashcard reviewed (correct): ${cardId}, moved to box ${newBox}`);
    } catch (error) {
      console.error('Failed to review flashcard:', error);
      throw new Error('Failed to review flashcard');
    }
  }

  /**
   * Review a flashcard (incorrect answer)
   */
  async reviewCardIncorrect(cardId: string): Promise<void> {
    try {
      const nextReviewDate = this.calculateNextReviewDate(1);

      await databaseManager.update(
        'flashcards',
        {
          box: 1, // Move back to box 1
          nextReviewDate: nextReviewDate,
          lastReviewedAt: new Date().toISOString()
        },
        'id = ?',
        [cardId]
      );

      console.log(`Flashcard reviewed (incorrect): ${cardId}, moved back to box 1`);
    } catch (error) {
      console.error('Failed to review flashcard:', error);
      throw new Error('Failed to review flashcard');
    }
  }

  /**
   * Get due flashcards (cards ready for review)
   */
  async getDueCards(): Promise<Flashcard[]> {
    try {
      const now = new Date().toISOString();
      const cards = await databaseManager.query<any>(
        'SELECT * FROM flashcards WHERE nextReviewDate <= ? ORDER BY nextReviewDate ASC',
        [now]
      );

      return this.mapCards(cards);
    } catch (error) {
      console.error('Failed to get due flashcards:', error);
      return [];
    }
  }

  /**
   * Get flashcards by subject
   */
  async getCardsBySubject(subject: string): Promise<Flashcard[]> {
    try {
      const cards = await databaseManager.query<any>(
        'SELECT * FROM flashcards WHERE subject = ? ORDER BY createdAt DESC',
        [subject]
      );

      return this.mapCards(cards);
    } catch (error) {
      console.error('Failed to get flashcards by subject:', error);
      return [];
    }
  }

  /**
   * Get due flashcards filtered by subjects
   */
  async getDueCardsBySubjects(subjects: string[]): Promise<Flashcard[]> {
    try {
      if (subjects.length === 0) {
        return this.getDueCards();
      }

      const now = new Date().toISOString();
      const placeholders = subjects.map(() => '?').join(', ');
      const cards = await databaseManager.query<any>(
        `SELECT * FROM flashcards WHERE nextReviewDate <= ? AND subject IN (${placeholders}) ORDER BY nextReviewDate ASC`,
        [now, ...subjects]
      );

      return this.mapCards(cards);
    } catch (error) {
      console.error('Failed to get due flashcards by subjects:', error);
      return [];
    }
  }

  /**
   * Get card count per subject
   */
  async getCardCountBySubject(): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};
      
      for (const subject of SUBJECT_CODES) {
        const result = await databaseManager.query<any>(
          'SELECT COUNT(*) as count FROM flashcards WHERE subject = ?',
          [subject]
        );
        counts[subject] = result[0]?.count || 0;
      }

      return counts;
    } catch (error) {
      console.error('Failed to get card counts:', error);
      return {};
    }
  }

  /**
   * Get due card count
   */
  async getDueCardCount(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const result = await databaseManager.query<any>(
        'SELECT COUNT(*) as count FROM flashcards WHERE nextReviewDate <= ?',
        [now]
      );
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get due card count:', error);
      return 0;
    }
  }

  /**
   * Get all flashcards
   */
  async getAllCards(): Promise<Flashcard[]> {
    try {
      const cards = await databaseManager.query<any>(
        'SELECT * FROM flashcards ORDER BY createdAt DESC'
      );

      return this.mapCards(cards);
    } catch (error) {
      console.error('Failed to get all flashcards:', error);
      return [];
    }
  }

  /**
   * Get a single flashcard by ID
   */
  async getCard(cardId: string): Promise<Flashcard | null> {
    try {
      const cards = await databaseManager.query<any>(
        'SELECT * FROM flashcards WHERE id = ?',
        [cardId]
      );

      if (cards.length === 0) {
        return null;
      }

      return this.mapCards(cards)[0];
    } catch (error) {
      console.error('Failed to get flashcard:', error);
      return null;
    }
  }

  /**
   * Calculate next review date based on box number
   */
  private calculateNextReviewDate(boxNumber: number): string {
    const daysToAdd = BOX_INTERVALS[boxNumber] || 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate.toISOString();
  }

  /**
   * Map database rows to Flashcard objects
   */
  private mapCards(rows: any[]): Flashcard[] {
    return rows.map(row => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      subject: row.subject,
      boxNumber: row.box,
      nextReviewDate: row.nextReviewDate,
      createdAt: row.createdAt,
      lastReviewedAt: row.lastReviewedAt
    }));
  }
}

// Singleton instance
export const flashcardEngine = new FlashcardEngineImpl();
