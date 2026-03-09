# EXPTracker Component

## Overview

The EXPTracker is a dashboard component that displays user progression stats with smooth 60fps animations using React Native Reanimated 3.

## Features

- **Real-time Stats Display**: Shows total EXP, daily EXP, current level, and rank
- **Animated Progress Bar**: Smooth progress bar showing advancement to next level
- **EXP Change Indicators**: Animated +/- indicators when EXP changes
- **Level-Up Animations**: Pulse and flash effects when leveling up
- **Neon Brutalist Design**: Follows the design system with proper colors and typography

## Requirements Satisfied

- **7.5**: EXP display with animated indicators
- **9.4**: Level calculation and display
- **9.5**: Rank display based on level
- **71.1**: Integration with EXPSystem service
- **77.1**: Reanimated 3 animations with useNativeDriver: true
- **77.2**: 60fps performance target

## Props

```typescript
interface EXPTrackerProps {
  onEXPChange?: (newTotal: number, dailyTotal: number, level: number, rank: string) => void;
  onLevelUp?: (newLevel: number, newRank: string) => void;
}
```

## Usage

```tsx
import { EXPTracker } from './components/EXPTracker';

function Dashboard() {
  const handleEXPChange = (total, daily, level, rank) => {
    console.log(`EXP updated: ${total} total, ${daily} daily, Level ${level}, ${rank}`);
  };

  const handleLevelUp = (newLevel, newRank) => {
    console.log(`Level up! Now ${newRank} at level ${newLevel}`);
  };

  return (
    <EXPTracker 
      onEXPChange={handleEXPChange}
      onLevelUp={handleLevelUp}
    />
  );
}
```

## Integration with EXPSystem

The component automatically loads user profile data from the EXPSystem service on mount:

```typescript
const profile = await expSystem.getUserProfile();
// Returns: { totalEXP, dailyEXP, level, rank, currentHP }
```

## Animations

All animations use React Native Reanimated 3 with `useNativeDriver: true` for optimal performance:

1. **Progress Bar**: Spring animation when EXP changes
2. **EXP Change Indicator**: Fade in, scale up, and float up animation
3. **Level Up**: Pulse scale and opacity flash animation

## Design System

Colors follow the Neon Brutalist design system:

- Background: `#0D0D0D` (surface)
- Border: `#1F1F1F` (border)
- Text: `#FFFFFF` (text)
- Daily EXP: `#00FF66` (growth)
- Rank: `#00E5FF` (active)
- Progress Bar: `#00FF66` (growth)

Typography:
- Labels: DM Sans
- Numbers: JetBrains Mono

## Performance

- Uses `useSharedValue` for animated values
- All animations run on the native thread
- Target: 60 FPS on Nothing Phone 3a
- No layout animations (only transform and opacity)
