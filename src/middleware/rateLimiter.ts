import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

const CLEANUP_INTERVAL = 60000;
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, CLEANUP_INTERVAL);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || "unknown",
    message = "Too many requests. Please try again later.",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    store[key].count++;

    const remaining = Math.max(0, max - store[key].count);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", store[key].resetTime);

    if (store[key].count > max) {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

export const apiChatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Chat requests rate limited. Max 20 per minute per IP.",
});

export const apiReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: "Read requests rate limited. Max 100 per minute per IP.",
});

export const healthLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 1000,
});
