import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { User, AgentInteraction, UserProfile } from '../models';
import { encrypt, decrypt } from '../utils/encryption';

describe('Mongoose Models', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/zenith-test';
    await mongoose.connect(mongoUri);
    
    // Ensure indexes are created
    await User.init();
    await AgentInteraction.init();
    await UserProfile.init();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await AgentInteraction.deleteMany({});
    await UserProfile.deleteMany({});
  });

  describe('User Model', () => {
    it('should create a user with encrypted password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        passwordHash: 'plaintext-password',
        totalEXP: 100,
        level: 1,
        rank: 'Script Novice',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.totalEXP).toBe(100);
      expect(user.level).toBe(1);
      expect(user.rank).toBe('Script Novice');
      
      // Password should be encrypted
      expect(user.passwordHash).not.toBe('plaintext-password');
      expect(user.passwordHash).toContain(':'); // Encrypted format has colons
      
      // Should be able to decrypt
      const decrypted = user.getPasswordHash();
      expect(decrypted).toBe('plaintext-password');
    });

    it('should validate email uniqueness', async () => {
      await User.create({
        email: 'duplicate@example.com',
        passwordHash: 'password123',
      });

      await expect(
        User.create({
          email: 'duplicate@example.com',
          passwordHash: 'password456',
        })
      ).rejects.toThrow();
    });

    it('should validate rank enum', async () => {
      await expect(
        User.create({
          email: 'test@example.com',
          passwordHash: 'password123',
          rank: 'Invalid Rank',
        })
      ).rejects.toThrow();
    });

    it('should not return passwordHash in JSON', () => {
      const user = new User({
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

  describe('AgentInteraction Model', () => {
    let userId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const user = await User.create({
        email: 'agent-test@example.com',
        passwordHash: 'password123',
      });
      userId = user._id;
    });

    it('should create agent interaction with timestamp', async () => {
      const interaction = await AgentInteraction.create({
        userId,
        agent: 'operator',
        input: 'What is my schedule today?',
        output: { message: 'You have 3 tasks scheduled' },
        processingTimeMs: 250,
      });

      expect(interaction.userId.toString()).toBe(userId.toString());
      expect(interaction.agent).toBe('operator');
      expect(interaction.input).toBe('What is my schedule today?');
      expect(interaction.output.message).toBe('You have 3 tasks scheduled');
      expect(interaction.processingTimeMs).toBe(250);
      expect(interaction.timestamp).toBeInstanceOf(Date);
    });

    it('should validate agent type enum', async () => {
      await expect(
        AgentInteraction.create({
          userId,
          agent: 'invalid-agent',
          input: 'test',
          output: {},
        })
      ).rejects.toThrow();
    });

    it('should have TTL index for 12-month retention', () => {
      const indexes = AgentInteraction.schema.indexes();
      const ttlIndex = indexes.find((idx: any) => 
        idx[1]?.expireAfterSeconds === 365 * 24 * 60 * 60
      );
      
      expect(ttlIndex).toBeDefined();
    });
  });

  describe('UserProfile Model', () => {
    let userId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const user = await User.create({
        email: 'profile-test@example.com',
        passwordHash: 'password123',
      });
      userId = user._id;
    });

    it('should create user profile with encrypted sensitive fields', async () => {
      const profile = await UserProfile.create({
        userId,
        githubUsername: 'testuser',
        githubToken: 'ghp_test_token_123',
        geminiApiKey: 'gemini_api_key_456',
      });

      expect(profile.userId.toString()).toBe(userId.toString());
      expect(profile.githubUsername).toBe('testuser');
      
      // Sensitive fields should be encrypted
      expect(profile.githubToken).not.toBe('ghp_test_token_123');
      expect(profile.geminiApiKey).not.toBe('gemini_api_key_456');
      expect(profile.githubToken).toContain(':');
      expect(profile.geminiApiKey).toContain(':');
      
      // Should be able to decrypt
      expect(profile.getGithubToken()).toBe('ghp_test_token_123');
      expect(profile.getGeminiApiKey()).toBe('gemini_api_key_456');
    });

    it('should not return encrypted fields in JSON', () => {
      const profile = new UserProfile({
        userId,
        githubUsername: 'testuser',
        githubToken: 'ghp_test_token_123',
        geminiApiKey: 'gemini_api_key_456',
      });

      const json = profile.toJSON();
      expect(json.githubToken).toBeUndefined();
      expect(json.geminiApiKey).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it('should have TTL index for 12-month retention', () => {
      const indexes = UserProfile.schema.indexes();
      const ttlIndex = indexes.find((idx: any) => 
        idx[1]?.expireAfterSeconds === 365 * 24 * 60 * 60
      );
      
      expect(ttlIndex).toBeDefined();
    });

    it('should enforce userId uniqueness', async () => {
      await UserProfile.create({
        userId,
        githubUsername: 'user1',
      });

      await expect(
        UserProfile.create({
          userId,
          githubUsername: 'user2',
        })
      ).rejects.toThrow();
    });
  });

  describe('Encryption Utility', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'sensitive-data-123';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBe('');
      
      const decrypted = decrypt('');
      expect(decrypted).toBe('');
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow();
    });
  });
});
