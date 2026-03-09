import morgan from 'morgan';
import { config } from '../config';

// Custom token for user ID
morgan.token('user-id', (req: any) => {
  return req.userId || 'anonymous';
});

// Development format with colors
const devFormat = ':method :url :status :response-time ms - :res[content-length] - user: :user-id';

// Production format (JSON-like)
const prodFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

export const requestLogger = morgan(
  config.nodeEnv === 'production' ? prodFormat : devFormat
);
