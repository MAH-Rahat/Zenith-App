# Zenith - Quick Start Guide

## What You Have

A fully functional native Android app called "Zenith" - your gamified productivity tracker for Nothing Phone 3a.

## What's Implemented

✅ **Core Features**:
- EXP Tracker with animated progress bars
- Contribution Grid with 7/30/60/90-day views
- Skill Tree with 6 levels (21 skills total)
- Daily Quest System (Main + Side quests)
- Countdown Timer (304 days remaining in 2026)
- Analytics Graphs with Victory Native
- Aggressive 9 PM notifications for zero EXP days

✅ **Technical**:
- React Native + Expo + TypeScript
- Local storage with AsyncStorage
- React Native Reanimated animations
- Nothing Phone theme (neon red accents)
- Device detection for Nothing Phone 3a

## Next Steps

### 1. Test the App Locally

```bash
cd zenith-app
npm start
```

Scan the QR code with Expo Go on your Nothing Phone 3a.

### 2. Build the APK

#### Using EAS Build (Easiest):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo (create free account if needed)
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile production
```

Wait 5-10 minutes, then download the APK from the link provided.

#### Using Local Build:

```bash
# Requires Android Studio installed
npx expo run:android --variant release
```

### 3. Install on Your Phone

1. Transfer APK to Nothing Phone 3a
2. Settings > Security > Enable "Install from Unknown Sources"
3. Open APK file and install
4. Grant notification permissions
5. Start using Zenith!

## How to Use Zenith

### Daily Workflow

1. **Morning**: Open app, check your daily quests
2. **Throughout Day**: Complete tasks, earn EXP
3. **Evening**: Review your contribution grid
4. **9 PM**: If you have 0 EXP, you'll get an aggressive notification

### Skill Tree Progression

- Start with Level 1 (React, Node.js, Express, MongoDB)
- Complete ALL skills in a level to unlock the next level
- Tap a skill to mark it complete
- Watch the unlock animation when you complete a level!

### Quest System

- **Main Quests**: Auto-generated academic tasks
- **Side Quests**: Tap the "+" button to add custom tasks
- Tap any quest to mark it complete and earn EXP

### Contribution Grid

- Green squares (or neon red on Nothing Phone) = active days
- Black squares = inactive days
- Switch between 7, 30, 60, 90-day views
- Keep your streak alive!

## Customization

### Change Quest Templates

Edit `src/components/DailyQuestSystem.tsx`:

```typescript
const FALLBACK_MAIN_QUESTS = [
  { description: 'Your custom quest', expValue: 100 },
  // Add more...
];
```

### Adjust EXP Values

Modify quest EXP values when creating side quests, or change the defaults in the quest system.

### Modify Skill Tree

Edit `src/components/SkillTree.tsx` to add/remove skills or change levels.

## Troubleshooting

### App won't start?
```bash
npm install
npm start -- --clear
```

### Notifications not working?
- Check app permissions in Settings
- Ensure "Do Not Disturb" allows app notifications

### Theme not applying?
- Device detection looks for "nothing" in brand/model name
- You can force it in `PlayerDashboard.tsx` by setting `isNothingPhone` to `true`

## File Structure

```
zenith-app/
├── src/
│   ├── components/       # UI components
│   ├── screens/          # Main screen
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── theme/            # Theme config
├── App.tsx               # Entry point
└── app.json              # Expo config
```

## Support

This is a personal-use app. For issues:
1. Check the console logs
2. Review the component code
3. Test on Expo Go first before building APK

## What's Next?

Optional enhancements you could add:
- Cloud sync (Firebase/Supabase)
- Widgets for home screen
- Achievements system
- Social features (compare with friends)
- More skill tree levels
- Custom notification sounds

Enjoy your productivity journey with Zenith! 🚀
