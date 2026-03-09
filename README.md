# Zenith - Developer Operating System

A gamified productivity app designed for developers, combining RPG mechanics with real-world skill progression. Built for Nothing Phone 3a with a Neon Brutalist design aesthetic.

## Features

### Core Systems
- **EXP & Leveling System**: Earn experience points through completed tasks, unlock 8 progressive ranks from Script Novice to Zenith Engineer
- **HP System**: Health points with inactivity penalties to maintain consistent productivity
- **Contribution Grid**: 90-day activity heatmap tracking daily progress
- **Skill Tree**: 4-phase progression system covering MERN Stack, DevOps, DevSecOps, and AI/ML

### Productivity Tools
- **Quest System**: Dual-column task management with energy categorization (High/Medium/Low)
- **Fog Mode**: AI-powered task breakdown into atomic micro-steps
- **Atomic Task Enforcer**: Prevents overwhelming tasks by requiring decomposition
- **Transit Mode**: Time-gated UI (5:00 PM - 10:00 PM) for low-energy work
- **Pomodoro Enforcer**: 25-minute focus sessions with AppState monitoring

### Academic Tools
- **Exam Countdown**: Track 4 courses with critical alerts at 7 days
- **Flashcard Engine**: Leitner 5-box spaced repetition system
- **Bug Grimoire**: Personal knowledge base for error solutions

### AI Agent System
Six specialized AI agents powered by Gemini 1.5 Pro:
- **OPERATOR**: Life administration and calendar management
- **SENTINEL**: Wellness enforcement with health score tracking
- **BROKER**: Financial intelligence with BDT-first currency support
- **ARCHITECT**: Career intelligence and skill gap analysis
- **FORGE**: Project accountability and GitHub integration
- **SIGNAL**: Market intelligence with web search capabilities

### Advanced Features
- **Graduation War Room**: Full-screen career readiness dashboard
- **Weekly Reflection**: Structured growth analysis every Sunday
- **PoW Compiler**: Generate Markdown reports of completed skills
- **Critical State**: Aggressive accountability when HP reaches zero

## Tech Stack

### Mobile App
- React Native with Expo SDK 51+
- TypeScript (strict mode)
- SQLite for offline-first data persistence
- NativeWind v4 for styling
- React Native Reanimated 3 for 60 FPS animations
- Expo Notifications for push notifications
- Expo Task Manager for background tasks

### Backend API
- Node.js + Express
- MongoDB Atlas for cloud storage
- Redis for caching
- JWT authentication with refresh tokens
- Rate limiting (100 requests per 15 minutes)

### External Integrations
- Gemini 1.5 Pro API for AI agents
- GitHub REST API v3 for repository tracking
- Exchange Rate API for BDT currency conversions
- Firebase Cloud Messaging for push notifications

## Design System

**Neon Brutalist Aesthetic**
- Zero shadows, depth through color contrast only
- 1px borders on all elements
- 20px border radius
- High-contrast neon accents on pure black

**Color Palette**
- Void: #000000 (backgrounds)
- Surface: #0D0D0D (cards)
- Surface Raised: #161616 (elevated elements)
- Border: #1F1F1F (all borders)
- Growth: #00FF66 (positive indicators)
- Alert: #FF2A42 (critical states)
- Active: #00E5FF (interactive elements)
- Caution: #FFB800 (attention states)

**Typography**
- JetBrains Mono for data (numbers, code, timestamps)
- DM Sans for UI text (labels, buttons, descriptions)

## Project Structure

```
zenith-app/
├── client/                 # React Native mobile app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── screens/       # Main app screens
│   │   ├── services/      # Business logic services
│   │   ├── config/        # Configuration files
│   │   ├── contexts/      # React contexts
│   │   ├── navigation/    # Navigation setup
│   │   └── types/         # TypeScript interfaces
│   ├── assets/            # Images and fonts
│   └── app.json           # Expo configuration
│
└── server/                # Node.js backend API
    ├── src/
    │   ├── routes/        # API endpoints
    │   ├── controllers/   # Request handlers
    │   ├── models/        # MongoDB schemas
    │   ├── middleware/    # Express middleware
    │   └── services/      # Business logic
    │       └── agents/    # AI agent implementations
    └── .env.example       # Environment variables template
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- MongoDB Atlas account
- Redis instance
- Gemini API key
- GitHub personal access token

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MAH-Rahat/Zenith-App.git
cd Zenith-App/zenith-app
```

2. Install client dependencies:
```bash
cd client
npm install
```

3. Install server dependencies:
```bash
cd ../server
npm install
```

4. Configure environment variables:
```bash
cd server
cp .env.example .env
# Edit .env with your API keys and connection strings
```

5. Start the backend server:
```bash
cd server
npm run dev
```

6. Start the mobile app:
```bash
cd client
npm start
```

### Running on Different Platforms

- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## Configuration

### Required API Keys

Add these to `server/.env`:

- `GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `GITHUB_TOKEN`: Create a [GitHub Personal Access Token](https://github.com/settings/tokens)
- `MONGODB_URI`: Get from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Generate a secure random string
- `JWT_REFRESH_SECRET`: Generate another secure random string

### Optional API Keys

- `EXCHANGE_RATE_API_KEY`: Get from [exchangerate-api.com](https://www.exchangerate-api.com/) (defaults to mock rates)

### Mobile App Configuration

Configure API keys in the Settings tab:
1. Open the app
2. Navigate to Settings tab
3. Enter your Gemini API key
4. Enter your GitHub personal access token

## Building for Production

### Android APK

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure EAS build:
```bash
cd client
eas build:configure
```

3. Build production APK:
```bash
eas build --platform android --profile production
```

4. Download and install the generated APK on your device

### Backend Deployment

Deploy the backend to your preferred cloud provider:
- AWS (EC2, Elastic Beanstalk, or Lambda)
- Google Cloud Platform
- Heroku
- DigitalOcean
- Railway

Ensure you configure:
- Environment variables
- MongoDB Atlas whitelist
- Redis instance
- SSL/TLS certificates
- Domain and DNS

## Testing

Run the test suite:

```bash
# Client tests
cd client
npm test

# Server tests
cd server
npm test

# Run with coverage
npm run test:coverage
```

## Performance Targets

- App launch time: < 2 seconds
- Contribution grid updates: < 100ms
- Database writes: < 100ms
- Animations: 60 FPS
- Background task polling: 60 seconds minimum

## Device Optimization

Optimized for Nothing Phone 3a:
- Display: 6.56-inch, 1080×2400 resolution
- Target frame rate: 60 FPS
- Touch targets: Minimum 44×44dp
- Responsive layout with 12-column Bento Grid

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ⚡ for developers who want to level up their skills while staying accountable.
