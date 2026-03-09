# Zenith Backend API

Backend API for Zenith Gamified Productivity App. Built with Node.js, Express, TypeScript, MongoDB Atlas, and Redis.

## Features

- RESTful API with Express.js
- TypeScript with strict mode
- JWT authentication
- Rate limiting (100 requests per 15 minutes per user)
- Request logging with Morgan
- Consistent error handling
- CORS support
- MongoDB Atlas integration (ready)
- Redis caching (ready)

## Project Structure

```
src/
├── config/          # Configuration and environment variables
├── controllers/     # Request handlers for routes
├── middleware/      # Express middleware (auth, rate limiting, error handling)
├── models/          # Mongoose schemas and models
├── routes/          # API route definitions
├── services/        # External API integrations (Gemini, GitHub, etc.)
├── types/           # TypeScript type definitions
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
- `MONGODB_URI`: MongoDB Atlas connection string
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: Secret key for JWT tokens
- `GEMINI_API_KEY`: Google Gemini API key

## Development

Start development server with hot reload:
```bash
npm run dev
```

## Production

Build TypeScript to JavaScript:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### AI Agents (Coming Soon)
- `POST /api/agents/route` - Master Router intent classification
- `POST /api/agents/operator` - Life administration agent
- `POST /api/agents/sentinel` - Wellness enforcement agent
- `POST /api/agents/broker` - Financial intelligence agent
- `POST /api/agents/architect` - Career intelligence agent
- `POST /api/agents/forge` - Project accountability agent
- `POST /api/agents/signal` - Market intelligence agent

## Rate Limiting

- Window: 15 minutes (900,000 ms)
- Max requests: 100 per user
- Returns 429 status code when exceeded

## Error Response Format

All errors follow this consistent format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## Success Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": {}
}
```
