/**
 * SkillTreePhases.ts
 * 
 * Defines the four-phase skill tree structure for Zenith's technology progression system.
 * Each phase contains specific skills that unlock based on completion of previous phases.
 * 
 * Phase Unlock Requirements:
 * - Phase 1 (MERN Stack): Unlocked by default
 * - Phase 2 (DevOps): Unlocks at 80% Phase 1 completion
 * - Phase 3 (DevSecOps): Unlocks at 50% Phase 2 completion
 * - Phase 4 (AI/ML): Unlocks at 100% Phase 3 completion
 * 
 * Requirements: 14.1, 14.2, 15.1, 15.2, 16.1, 16.2, 17.1, 17.2
 */

/**
 * Skill node definition within a phase
 */
export interface SkillDefinition {
  id: string;
  name: string;
  description?: string;
}

/**
 * Phase definition with unlock requirements
 */
export interface PhaseDefinition {
  id: number;
  name: string;
  description: string;
  skills: SkillDefinition[];
  unlockRequirement: {
    type: 'default' | 'phase_completion';
    previousPhase?: number;
    completionPercentage?: number;
  };
  unlockMessage: string;
}

/**
 * SKILL_TREE_PHASES: Complete four-phase skill tree configuration
 * 
 * Phase 1 - MERN Stack: Foundation web development skills
 * Phase 2 - DevOps: Infrastructure and deployment skills
 * Phase 3 - DevSecOps: Security and operations skills
 * Phase 4 - AI/ML: Machine learning and AI engineering skills
 */
export const SKILL_TREE_PHASES: PhaseDefinition[] = [
  {
    id: 1,
    name: 'MERN Stack',
    description: 'Foundation web development with MongoDB, Express, React, and Node.js',
    skills: [
      {
        id: 'react-hooks',
        name: 'React Hooks',
        description: 'Modern React state management with hooks',
      },
      {
        id: 'context-zustand',
        name: 'Context/Zustand',
        description: 'State management with Context API and Zustand',
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        description: 'React framework for production applications',
      },
      {
        id: 'node-express',
        name: 'Node/Express',
        description: 'Backend API development with Node.js and Express',
      },
      {
        id: 'mongodb',
        name: 'MongoDB',
        description: 'NoSQL database design and operations',
      },
    ],
    unlockRequirement: {
      type: 'default',
    },
    unlockMessage: 'Unlocked by default',
  },
  {
    id: 2,
    name: 'DevOps',
    description: 'Infrastructure, deployment, and operations',
    skills: [
      {
        id: 'linux-bash',
        name: 'Linux Bash',
        description: 'Command-line proficiency and shell scripting',
      },
      {
        id: 'git',
        name: 'Git',
        description: 'Version control and collaboration workflows',
      },
      {
        id: 'docker',
        name: 'Docker',
        description: 'Containerization and Docker Compose',
      },
      {
        id: 'cicd',
        name: 'CI/CD',
        description: 'Continuous integration and deployment pipelines',
      },
      {
        id: 'aws-vercel',
        name: 'AWS/Vercel',
        description: 'Cloud deployment and hosting platforms',
      },
    ],
    unlockRequirement: {
      type: 'phase_completion',
      previousPhase: 1,
      completionPercentage: 80,
    },
    unlockMessage: 'Unlock at 80% Phase 1',
  },
  {
    id: 3,
    name: 'DevSecOps',
    description: 'Security engineering and secure operations',
    skills: [
      {
        id: 'jwt',
        name: 'JWT',
        description: 'JSON Web Token authentication',
      },
      {
        id: 'bcrypt',
        name: 'bcrypt',
        description: 'Password hashing and security',
      },
      {
        id: 'owasp-top-10',
        name: 'OWASP Top 10',
        description: 'Web application security vulnerabilities',
      },
      {
        id: 'nmap',
        name: 'Nmap',
        description: 'Network scanning and reconnaissance',
      },
      {
        id: 'wireshark',
        name: 'Wireshark',
        description: 'Network protocol analysis',
      },
    ],
    unlockRequirement: {
      type: 'phase_completion',
      previousPhase: 2,
      completionPercentage: 50,
    },
    unlockMessage: 'Unlock at 50% Phase 2',
  },
  {
    id: 4,
    name: 'AI/ML',
    description: 'Machine learning and AI engineering',
    skills: [
      {
        id: 'python',
        name: 'Python',
        description: 'Python programming for data science and ML',
      },
      {
        id: 'pandas-numpy',
        name: 'Pandas/NumPy',
        description: 'Data manipulation and numerical computing',
      },
      {
        id: 'scikit-learn',
        name: 'Scikit-Learn',
        description: 'Machine learning algorithms and models',
      },
      {
        id: 'tensorflow-keras',
        name: 'TensorFlow/Keras',
        description: 'Deep learning frameworks',
      },
      {
        id: 'local-llm',
        name: 'Local LLM',
        description: 'Running and fine-tuning local language models',
      },
    ],
    unlockRequirement: {
      type: 'phase_completion',
      previousPhase: 3,
      completionPercentage: 100,
    },
    unlockMessage: 'Unlock at 100% Phase 3',
  },
];

/**
 * Helper function to get a phase by ID
 */
export function getPhaseById(phaseId: number): PhaseDefinition | undefined {
  return SKILL_TREE_PHASES.find((phase) => phase.id === phaseId);
}

/**
 * Helper function to get all skills from a specific phase
 */
export function getSkillsByPhase(phaseId: number): SkillDefinition[] {
  const phase = getPhaseById(phaseId);
  return phase?.skills || [];
}

/**
 * Helper function to get total skill count across all phases
 */
export function getTotalSkillCount(): number {
  return SKILL_TREE_PHASES.reduce((total, phase) => total + phase.skills.length, 0);
}

/**
 * Helper function to get skill count for a specific phase
 */
export function getPhaseSkillCount(phaseId: number): number {
  const phase = getPhaseById(phaseId);
  return phase?.skills.length || 0;
}

/**
 * Helper function to check if a phase should be unlocked based on previous phase completion
 */
export function shouldUnlockPhase(
  phaseId: number,
  previousPhaseCompletionPercentage: number
): boolean {
  const phase = getPhaseById(phaseId);
  
  if (!phase) {
    return false;
  }
  
  // Phase 1 is always unlocked
  if (phase.unlockRequirement.type === 'default') {
    return true;
  }
  
  // Check if previous phase completion meets the requirement
  if (phase.unlockRequirement.type === 'phase_completion') {
    const requiredPercentage = phase.unlockRequirement.completionPercentage || 0;
    return previousPhaseCompletionPercentage >= requiredPercentage;
  }
  
  return false;
}

/**
 * Type exports for type-safe usage across the app
 */
export type PhaseId = 1 | 2 | 3 | 4;
export type SkillId = string;

/**
 * Constants for easy reference
 */
export const PHASE_COUNT = SKILL_TREE_PHASES.length;
export const PHASE_IDS = SKILL_TREE_PHASES.map((phase) => phase.id) as PhaseId[];

