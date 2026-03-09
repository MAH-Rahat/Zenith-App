// Data Models

export interface EXPData {
  totalEXP: number;
  dailyEXP: number;
  lastResetDate: string;
  expHistory: EXPHistoryEntry[];
}

export interface EXPHistoryEntry {
  date: string;
  expEarned: number;
}

export interface ActivityGridData {
  activities: Record<string, ActivityDay>;
}

export interface ActivityDay {
  date: string;
  hasActivity: boolean;
  tasksCompleted: number;
  expEarned: number;
}

export interface SkillTreeData {
  skills: SkillNode[];
  lastUpdated: string;
}

export interface SkillNode {
  id: string;
  name: string;
  phase: number;
  level: number;
  isUnlocked: boolean;
  isComplete: boolean;
  proofOfWork?: string;
  completedAt?: string;
}

export interface QuestData {
  mainQuests: Quest[];
  sideQuests: Quest[];
  lastGenerationDate: string;
}

export interface Quest {
  id: string;
  description: string;
  expValue: number;
  isComplete: boolean;
  type: 'main' | 'side';
  createdAt: string;
  completedAt?: string;
}

export interface NotificationLogData {
  events: NotificationEvent[];
}

export interface NotificationEvent {
  timestamp: string;
  dailyEXP: number;
  daysRemaining: number;
  notificationSent: boolean;
  reason?: string;
}

export interface AppStateData {
  lastLaunchDate: string;
  launchCount: number;
  isFirstLaunch: boolean;
  themeMode: 'nothing' | 'default';
}

// Component Props

export interface EXPTrackerProps {
  onEXPChange?: (newTotal: number, dailyTotal: number) => void;
}

export interface ContributionGridProps {
  timeRange: 7 | 30 | 60 | 90;
  onTimeRangeChange: (range: number) => void;
  isNothingPhone: boolean;
}

export interface SkillTreeProps {
  onSkillComplete: (skillId: string) => void;
}

export interface DailyQuestSystemProps {
  onQuestComplete: (questId: string, expValue: number) => void;
}

// Service Interfaces

export interface StorageManager {
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface SentinelSystem {
  initialize(): Promise<void>;
  scheduleDaily9PMCheck(): void;
  checkAndNotify(): Promise<void>;
  logNotificationEvent(event: NotificationEvent): Promise<void>;
}

export interface AnimationController {
  playTaskCompletionAnimation(): void;
  playEXPBarFillAnimation(amount: number): void;
  playSkillUnlockAnimation(): void;
  playRankUpAnimation(newRank: string): void;
  triggerHapticFeedback(): void;
}

// AI Agent Types

export type AgentIntent = 'life_admin' | 'wellness' | 'finance' | 'career' | 'project' | 'market';

export interface AgentResponse {
  agent: string;
  intent: AgentIntent;
  timestamp: string;
  data: unknown;
}

// Master Router

export interface MasterRouterInput {
  userInput: string;
  userId: string;
}

export interface MasterRouterOutput {
  intent: AgentIntent;
  targetAgent: string;
  confidence: number;
}

// OPERATOR Agent

export interface OperatorInput {
  userId: string;
  calendarData?: CalendarEvent[];
  currentDate: string;
}

export interface OperatorOutput {
  priority_tasks: string[];
  conflicts_detected: ScheduleConflict[];
  calendar_blocks: TimeBlock[];
  next_deadline: Deadline | null;
  auto_quests: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface ScheduleConflict {
  event1: string;
  event2: string;
  conflictTime: string;
}

export interface TimeBlock {
  startTime: string;
  endTime: string;
  reason: string;
  isHardBlock: boolean;
}

export interface Deadline {
  title: string;
  dueDate: string;
  daysRemaining: number;
  priority: 'high' | 'medium' | 'low';
}

// SENTINEL Agent

export interface SentinelInput {
  userId: string;
  sleepHours: number;
  hydrationMl: number;
  workoutCompleted: boolean;
  dietQuality: 'clean' | 'moderate' | 'junk';
  date: string;
}

export interface SentinelOutput {
  health_score: number;
  push_notification: string | null;
  daily_report: string;
  reprimand_triggered: boolean;
  cognitive_risk: boolean;
}

// BROKER Agent

export interface BrokerInput {
  userId: string;
  transactions?: Transaction[];
  currentDate: string;
}

export interface BrokerOutput {
  balance_bdt: number;
  monthly_income_bdt: number;
  burn_rate_bdt: number;
  runway_days: number;
  savings_rate_percent: number;
  fx_rates: FXRates;
  alert: string | null;
  spending_breakdown: SpendingCategory[];
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  description?: string;
}

export interface FXRates {
  bdt_to_usd: number;
  bdt_to_eur: number;
  lastUpdated: string;
}

export interface SpendingCategory {
  category: string;
  amount_bdt: number;
  percentage: number;
}

// ARCHITECT Agent

export interface ArchitectInput {
  userId: string;
  completedQuests: Quest[];
  skillTreeData: SkillTreeData;
  weeklyReflection?: WeeklyReflectionAnswers;
}

export interface ArchitectOutput {
  career_alignment_score: number;
  weekly_critical_path: string[];
  skill_gap_analysis: SkillGap[];
  portfolio_health: number;
  graduation_readiness_score: number;
  hard_truth: string;
}

export interface WeeklyReflectionAnswers {
  accomplishments: string;
  avoided_tasks: string;
  learning: string;
  challenges: string;
  next_week_priorities: string;
}

export interface SkillGap {
  skill: string;
  marketDemand: 'high' | 'medium' | 'low';
  impact: number;
  suggestedResources: string[];
}

// FORGE Agent

export interface ForgeInput {
  userId: string;
  githubUsername?: string;
  repositories?: Repository[];
}

export interface ForgeOutput {
  active_projects: ProjectStatus[];
  suggested_next_build: string;
  shipped_this_month: number;
  accountability_message: string;
  design_leverage_score: number;
}

export interface Repository {
  name: string;
  url: string;
  lastCommitDate: string;
  hasReadme: boolean;
  hasLiveDemo: boolean;
  description?: string;
}

export interface ProjectStatus {
  name: string;
  completionPercentage: number;
  lastActivity: string;
  status: 'active' | 'abandoned' | 'shipped';
  missingElements: string[];
}

// SIGNAL Agent

export interface SignalInput {
  userId: string;
  searchQuery?: string;
  focusArea?: 'ai_ml' | 'fullstack' | 'bangladesh_market' | 'opportunities';
}

export interface SignalOutput {
  top_demanded_skills: SkillDemand[];
  opportunities: Opportunity[];
  bangladesh_market_insights: MarketInsight[];
  trending_this_week: string[];
  alert: string | null;
}

export interface SkillDemand {
  skill: string;
  demandScore: number;
  weekOverWeekChange: number;
  jobPostingCount: number;
}

export interface Opportunity {
  title: string;
  type: 'hackathon' | 'bounty' | 'freelance' | 'event';
  deadline: string;
  url: string;
  relevanceScore: number;
}

export interface MarketInsight {
  insight: string;
  source: string;
  relevance: 'high' | 'medium' | 'low';
  actionable: boolean;
}

// Exam Countdown Types

export interface Exam {
  id: string;
  name: 'CSE321' | 'CSE341' | 'CSE422' | 'CSE423';
  date: string;
  color: string;
  daysRemaining: number;
  isCritical: boolean;
}

export interface ExamCountdownProps {
  onExamCritical?: (examName: string, daysRemaining: number) => void;
}
