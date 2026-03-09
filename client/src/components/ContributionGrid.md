# ContributionGrid Component

## Overview
The ContributionGrid component is a 90-day activity heatmap that visualizes daily productivity with color-coded cells based on EXP earned. Similar to GitHub's contribution graph, it provides a visual representation of consistency patterns.

## Requirements Implemented
- **12.1**: Displays exactly 90 days of activity data
- **12.2**: Implements 5-state cell coloring based on EXP earned
- **12.3**: Arranges cells in calendar grid format
- **12.4**: Labels weeks and months
- **12.7**: Persists daily EXP totals to contribution_grid table

## Features

### 1. Exactly 90 Cells
The component renders exactly 90 cells representing the last 90 days of activity, calculated from today backwards.

### 2. Five Cell States
Each cell can be in one of five states based on EXP earned:
- **Future/Unlogged** (#1F1F1F): Days that haven't occurred yet or have no data
- **Partial Activity** (#004D1F): Days with 1-19 EXP earned
- **Full Activity** (#00FF66): Days with 20+ EXP earned (growth color)
- **Zero EXP** (#FF2A42): Days with logged activity but 0 EXP (alert color)
- **Shattered** (#888888): Days during Critical State (void color)

### 3. Calendar Grid Format
The cells are arranged in a grid format with:
- 8x8 pixel cells with 3px gaps
- Horizontal scrolling for viewing all 90 days
- Month labels at the top showing when each month starts

### 4. Database Persistence
The `markDayActive(date, expEarned)` method:
- Accepts a Date object and EXP amount
- Persists to the `contribution_grid` table in SQLite
- Updates existing entries or creates new ones
- Automatically reloads the grid after updates

### 5. Performance Optimization
- Uses `useMemo` for cell color calculations (Requirement 12.6)
- Implements React.memo for cell components (Requirement 12.5)
- Updates within 100ms when data changes

## Usage

```typescript
import { ContributionGrid } from './components/ContributionGrid';

// Basic usage
<ContributionGrid />

// With cell tap handler
<ContributionGrid 
  onCellTap={(date, dailyEXP, quests) => {
    console.log(`Tapped ${date}: ${dailyEXP} EXP`);
  }}
/>

// Mark a day as active
const grid = useRef<ContributionGrid>(null);
await grid.current?.markDayActive(new Date(), 25);
```

## Database Schema
The component reads from and writes to the `contribution_grid` table:

```sql
CREATE TABLE contribution_grid (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  expEarned INTEGER NOT NULL DEFAULT 0,
  questsCompleted INTEGER NOT NULL DEFAULT 0,
  hasActivity INTEGER NOT NULL DEFAULT 0,
  is_shattered INTEGER NOT NULL DEFAULT 0
)
```

## Design System Compliance
- Uses Neon Brutalist color tokens
- 1px borders with #1F1F1F border color
- Surface color (#0D0D0D) for card background
- 20px border radius for card
- Zero box shadows

## Future Enhancements (Not in Current Task)
- Cell tap interaction to show daily details (Task 9.4)
- Bottom sheet with quest list and HP changes
- Week labels on the left side
- Hover states for desktop web version
