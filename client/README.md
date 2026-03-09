# Zenith - Gamified Productivity App

A native Android mobile app for Nothing Phone 3a that gamifies productivity tracking through RPG-style mechanics.

## Features

- **EXP Tracking**: Earn experience points by completing tasks
- **Contribution Grid**: GitHub-style heat map showing daily activity
- **Skill Tree**: Sequential AI/MERN technology roadmap with 6 levels
- **Daily Quests**: Academic and custom task management
- **Aggressive Accountability**: 9 PM notifications when daily EXP is zero
- **Nothing Phone Theme**: Neon red accents and high-contrast design

## Tech Stack

- React Native with Expo
- TypeScript
- AsyncStorage for local data persistence
- React Native Reanimated for animations
- Victory Native for charts
- Expo Notifications for accountability alerts

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

```bash
cd zenith-app
npm install
```

### Run Development Server

```bash
npm start
```

Then scan the QR code with Expo Go app on your Android device.

## Building APK

### Option 1: EAS Build (Recommended)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure EAS Build:
```bash
eas build:configure
```

4. Build production APK:
```bash
eas build --platform android --profile production
```

5. Download the APK from the provided link

### Option 2: Local Build

1. Install Android Studio and set up Android SDK

2. Build locally:
```bash
npx expo run:android --variant release
```

3. Find APK in `android/app/build/outputs/apk/release/`

## Installation on Nothing Phone 3a

1. Transfer the APK file to your Nothing Phone 3a
2. Enable "Install from Unknown Sources" in Settings > Security
3. Open the APK file and install
4. Grant notification permissions when prompted
5. Launch Zenith and start tracking your progress!

## App Structure

```
zenith-app/
├── src/
│   ├── components/       # React components
│   │   ├── EXPTracker.tsx
│   │   ├── ContributionGrid.tsx
│   │   ├── SkillTree.tsx
│   │   ├── DailyQuestSystem.tsx
│   │   ├── CountdownTimer.tsx
│   │   └── AnalyticsGraphs.tsx
│   ├── screens/          # Screen components
│   │   └── PlayerDashboard.tsx
│   ├── services/         # Business logic
│   │   ├── StorageManager.ts
│   │   ├── SentinelSystem.ts
│   │   └── AnimationController.ts
│   ├── types/            # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   └── deviceDetection.ts
│   └── theme/            # Theme definitions
│       └── index.ts
├── App.tsx               # App entry point
└── app.json              # Expo configuration
```

## Skill Tree Levels

1. **Level 1**: Advanced React, Node.js, Express, MongoDB
2. **Level 2**: Linux CLI, Docker, Docker Compose
3. **Level 3**: Python 3, FastAPI, Gemini API, OpenAI API
4. **Level 4**: Pandas, NumPy, LangChain, HuggingFace
5. **Level 5**: JWT Auth, OWASP Top 10, GitHub Actions
6. **Level 6**: TensorFlow, PyTorch

## License

Personal use only.
