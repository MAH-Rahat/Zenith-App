/**
 * SkillTreePhases.test.ts
 * 
 * Unit tests for the skill tree phase configuration
 */

import {
  SKILL_TREE_PHASES,
  getPhaseById,
  getSkillsByPhase,
  getTotalSkillCount,
  getPhaseSkillCount,
  shouldUnlockPhase,
  PHASE_COUNT,
  PHASE_IDS,
} from '../SkillTreePhases';

describe('SkillTreePhases Configuration', () => {
  describe('SKILL_TREE_PHASES structure', () => {
    it('should have exactly 4 phases', () => {
      expect(SKILL_TREE_PHASES).toHaveLength(4);
      expect(PHASE_COUNT).toBe(4);
    });

    it('should have correct phase IDs', () => {
      expect(PHASE_IDS).toEqual([1, 2, 3, 4]);
    });

    it('should have Phase 1 (MERN Stack) with 5 skills', () => {
      const phase1 = SKILL_TREE_PHASES[0];
      expect(phase1.id).toBe(1);
      expect(phase1.name).toBe('MERN Stack');
      expect(phase1.skills).toHaveLength(5);
      expect(phase1.skills.map(s => s.name)).toEqual([
        'React Hooks',
        'Context/Zustand',
        'Next.js',
        'Node/Express',
        'MongoDB',
      ]);
    });

    it('should have Phase 2 (DevOps) with 5 skills', () => {
      const phase2 = SKILL_TREE_PHASES[1];
      expect(phase2.id).toBe(2);
      expect(phase2.name).toBe('DevOps');
      expect(phase2.skills).toHaveLength(5);
      expect(phase2.skills.map(s => s.name)).toEqual([
        'Linux Bash',
        'Git',
        'Docker',
        'CI/CD',
        'AWS/Vercel',
      ]);
    });

    it('should have Phase 3 (DevSecOps) with 5 skills', () => {
      const phase3 = SKILL_TREE_PHASES[2];
      expect(phase3.id).toBe(3);
      expect(phase3.name).toBe('DevSecOps');
      expect(phase3.skills).toHaveLength(5);
      expect(phase3.skills.map(s => s.name)).toEqual([
        'JWT',
        'bcrypt',
        'OWASP Top 10',
        'Nmap',
        'Wireshark',
      ]);
    });

    it('should have Phase 4 (AI/ML) with 5 skills', () => {
      const phase4 = SKILL_TREE_PHASES[3];
      expect(phase4.id).toBe(4);
      expect(phase4.name).toBe('AI/ML');
      expect(phase4.skills).toHaveLength(5);
      expect(phase4.skills.map(s => s.name)).toEqual([
        'Python',
        'Pandas/NumPy',
        'Scikit-Learn',
        'TensorFlow/Keras',
        'Local LLM',
      ]);
    });
  });

  describe('Unlock requirements', () => {
    it('should have Phase 1 unlocked by default', () => {
      const phase1 = SKILL_TREE_PHASES[0];
      expect(phase1.unlockRequirement.type).toBe('default');
      expect(phase1.unlockMessage).toBe('Unlocked by default');
    });

    it('should require 80% Phase 1 completion to unlock Phase 2', () => {
      const phase2 = SKILL_TREE_PHASES[1];
      expect(phase2.unlockRequirement.type).toBe('phase_completion');
      expect(phase2.unlockRequirement.previousPhase).toBe(1);
      expect(phase2.unlockRequirement.completionPercentage).toBe(80);
      expect(phase2.unlockMessage).toBe('Unlock at 80% Phase 1');
    });

    it('should require 50% Phase 2 completion to unlock Phase 3', () => {
      const phase3 = SKILL_TREE_PHASES[2];
      expect(phase3.unlockRequirement.type).toBe('phase_completion');
      expect(phase3.unlockRequirement.previousPhase).toBe(2);
      expect(phase3.unlockRequirement.completionPercentage).toBe(50);
      expect(phase3.unlockMessage).toBe('Unlock at 50% Phase 2');
    });

    it('should require 100% Phase 3 completion to unlock Phase 4', () => {
      const phase4 = SKILL_TREE_PHASES[3];
      expect(phase4.unlockRequirement.type).toBe('phase_completion');
      expect(phase4.unlockRequirement.previousPhase).toBe(3);
      expect(phase4.unlockRequirement.completionPercentage).toBe(100);
      expect(phase4.unlockMessage).toBe('Unlock at 100% Phase 3');
    });
  });

  describe('Helper functions', () => {
    describe('getPhaseById', () => {
      it('should return correct phase for valid ID', () => {
        const phase1 = getPhaseById(1);
        expect(phase1?.name).toBe('MERN Stack');

        const phase2 = getPhaseById(2);
        expect(phase2?.name).toBe('DevOps');
      });

      it('should return undefined for invalid ID', () => {
        const phase = getPhaseById(99);
        expect(phase).toBeUndefined();
      });
    });

    describe('getSkillsByPhase', () => {
      it('should return all skills for a valid phase', () => {
        const skills = getSkillsByPhase(1);
        expect(skills).toHaveLength(5);
        expect(skills[0].name).toBe('React Hooks');
      });

      it('should return empty array for invalid phase', () => {
        const skills = getSkillsByPhase(99);
        expect(skills).toEqual([]);
      });
    });

    describe('getTotalSkillCount', () => {
      it('should return total of 20 skills across all phases', () => {
        const total = getTotalSkillCount();
        expect(total).toBe(20);
      });
    });

    describe('getPhaseSkillCount', () => {
      it('should return 5 skills for each phase', () => {
        expect(getPhaseSkillCount(1)).toBe(5);
        expect(getPhaseSkillCount(2)).toBe(5);
        expect(getPhaseSkillCount(3)).toBe(5);
        expect(getPhaseSkillCount(4)).toBe(5);
      });

      it('should return 0 for invalid phase', () => {
        expect(getPhaseSkillCount(99)).toBe(0);
      });
    });

    describe('shouldUnlockPhase', () => {
      it('should always unlock Phase 1', () => {
        expect(shouldUnlockPhase(1, 0)).toBe(true);
        expect(shouldUnlockPhase(1, 50)).toBe(true);
        expect(shouldUnlockPhase(1, 100)).toBe(true);
      });

      it('should unlock Phase 2 at 80% Phase 1 completion', () => {
        expect(shouldUnlockPhase(2, 79)).toBe(false);
        expect(shouldUnlockPhase(2, 80)).toBe(true);
        expect(shouldUnlockPhase(2, 100)).toBe(true);
      });

      it('should unlock Phase 3 at 50% Phase 2 completion', () => {
        expect(shouldUnlockPhase(3, 49)).toBe(false);
        expect(shouldUnlockPhase(3, 50)).toBe(true);
        expect(shouldUnlockPhase(3, 100)).toBe(true);
      });

      it('should unlock Phase 4 at 100% Phase 3 completion', () => {
        expect(shouldUnlockPhase(4, 99)).toBe(false);
        expect(shouldUnlockPhase(4, 100)).toBe(true);
      });

      it('should return false for invalid phase', () => {
        expect(shouldUnlockPhase(99, 100)).toBe(false);
      });
    });
  });

  describe('Skill IDs', () => {
    it('should have unique skill IDs across all phases', () => {
      const allSkillIds = SKILL_TREE_PHASES.flatMap(phase => 
        phase.skills.map(skill => skill.id)
      );
      const uniqueIds = new Set(allSkillIds);
      expect(uniqueIds.size).toBe(allSkillIds.length);
    });

    it('should use kebab-case for skill IDs', () => {
      const allSkillIds = SKILL_TREE_PHASES.flatMap(phase => 
        phase.skills.map(skill => skill.id)
      );
      allSkillIds.forEach(id => {
        expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });
  });
});
