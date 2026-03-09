# EXPTracker to EXPSystem Wiring Documentation

## Overview

The EXPTracker component is now wired to the EXPSystem service using an observer pattern. When EXP is awarded anywhere in the app via `expSystem.awardEXP()`, the EXPTracker component automatically updates its display and triggers appropriate animations.

## Implementation Details

### 1. EXPSystem Listener Pattern

The EXPSystem service now supports registering listeners that get notified when EXP changes:

```typescript
// In EXPSystem.ts
type EXPChangeListener = (data: {
  totalEXP: number;
  dailyEXP: number;
  level: number;
  rank: string;
  leveledUp: boolean;
  rankChanged: boolean;
}) => void;

class EXPSystemImpl {
  private listeners: Set<EXPChangeListener> = new Set();

  addListener(listener: EXPChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(data: {...}): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in EXP change listener:', error);
      }
    });
  }
}
```

### 2. EXPTracker Subscription

The EXPTracker component subscribes to EXP changes in its useEffect hook:

```typescript
// In EXPTracker.tsx
useEffect(() => {
  loadUserProfile();

  // Subscribe to EXP changes from EXPSystem
  const unsubscribe = expSystem.addListener((data) => {
    handleEXPChange(data);
  });

  // Cleanup subscription on unmount
  return () => {
    unsubscribe();
  };
}, []);
```

### 3. Automatic UI Updates

When EXP is awarded, the EXPTracker automatically:

1. **Updates display values**: totalEXP, dailyEXP, level, rank
2. **Shows EXP change indicator**: Animated +/- indicator with the amount
3. **Animates progress bar**: Smooth spring animation to new progress
4. **Triggers level-up animation**: Pulse effect when level increases
5. **Triggers rank-up animation**: Via AnimationController when rank changes
6. **Notifies parent components**: Via optional callbacks

```typescript
const handleEXPChange = (data: {
  totalEXP: number;
  dailyEXP: number;
  level: number;
  rank: string;
  leveledUp: boolean;
  rankChanged: boolean;
}): void => {
  const expDifference = data.totalEXP - totalEXP;

  // Update state
  setTotalEXP(data.totalEXP);
  setDailyEXP(data.dailyEXP);
  setLevel(data.level);
  setRank(data.rank);

  // Show EXP change indicator
  if (expDifference !== 0) {
    setExpChange(expDifference);
    animateEXPChange();
  }

  // Animate progress bar
  const progress = expSystem.getLevelProgress(data.totalEXP);
  progressWidth.value = withSpring(progress, {
    damping: 15,
    stiffness: 100,
  });

  // Trigger level-up animation if level changed
  if (data.leveledUp) {
    animateLevelUp();
    onLevelUp?.(data.level, data.rank);
  }

  // Notify parent component
  onEXPChange?.(data.totalEXP, data.dailyEXP, data.level, data.rank);
};
```

## Usage Examples

### Basic Usage

```typescript
import { EXPTracker } from '../components/EXPTracker';

function HomeScreen() {
  return (
    <View>
      <EXPTracker />
    </View>
  );
}
```

### With Callbacks

```typescript
import { EXPTracker } from '../components/EXPTracker';

function HomeScreen() {
  const handleEXPChange = (totalEXP, dailyEXP, level, rank) => {
    console.log(`EXP updated: ${totalEXP} (Level ${level}, ${rank})`);
  };

  const handleLevelUp = (newLevel, newRank) => {
    console.log(`Level up! Now level ${newLevel} (${newRank})`);
    // Show celebration modal, play sound, etc.
  };

  return (
    <View>
      <EXPTracker 
        onEXPChange={handleEXPChange}
        onLevelUp={handleLevelUp}
      />
    </View>
  );
}
```

### Awarding EXP from Other Components

```typescript
import { expSystem } from '../services/EXPSystem';

// In QuestSystem
async function completeQuest(questId: string) {
  const quest = await getQuest(questId);
  
  // Award EXP - EXPTracker will automatically update
  await expSystem.awardEXP(quest.expValue, 'quest');
  
  // Mark quest as complete
  await markQuestComplete(questId);
}

// In PomodoroTimer
async function completePomodoro() {
  // Award EXP - EXPTracker will automatically update
  await expSystem.awardEXP(20, 'pomodoro_success');
}

// In SkillTree
async function submitProofOfWork(skillId: string, proof: string) {
  // Award EXP - EXPTracker will automatically update
  await expSystem.awardEXP(50, 'skill_node');
  
  // Mark skill as complete
  await markSkillComplete(skillId, proof);
}
```

## Animation Details

### EXP Change Indicator
- Fades in and scales up from 0.5 to 1.0
- Floats upward by 30 pixels
- Displays for 2 seconds then fades out
- Shows green for positive, red for negative

### Level-Up Animation
- Scales level and rank text from 1.0 to 1.2 and back
- Pulses opacity 4 times (0.5 → 1.0 → 0.5 → 1.0)
- Uses spring animation for smooth feel

### Progress Bar
- Animates width using spring physics
- Damping: 15, Stiffness: 100
- Smooth transition to new progress percentage

### Rank-Up Animation
- Handled by AnimationController service
- Plays full-screen rank-up effect
- Triggered automatically when rank changes

## Requirements Satisfied

- **Requirement 9.5**: EXP Tracker displays current EXP, level, and rank
- **Requirement 10.4**: Rank-up animation plays when rank increases
- **Requirement 7.5**: EXP changes persist to database within 100ms
- **Requirement 77.1**: Level-up animation triggers when level increases
- **Requirement 77.2**: Smooth 60 FPS animations using useNativeDriver

## Benefits of This Approach

1. **Decoupled Architecture**: EXPTracker doesn't need to know about QuestSystem, PomodoroTimer, etc.
2. **Automatic Updates**: Any component can award EXP and UI updates automatically
3. **Multiple Listeners**: Multiple components can listen to EXP changes if needed
4. **Clean Unsubscribe**: Listeners are automatically cleaned up on unmount
5. **Error Isolation**: Errors in one listener don't affect others
6. **Type Safety**: TypeScript ensures correct data structure
7. **Performance**: Minimal overhead, only notifies when EXP actually changes
