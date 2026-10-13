import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;
  const hits = new Map<string, { count: number; resetTime: number }>();

  // Periodically clean up expired entries every 60 seconds
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits.entries()) {
      if (now > value.resetTime) {
        hits.delete(key);
      }
    }
  }, 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now > entry.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        error: message,
        retryAfter: retryAfterSec,
      });
      return;
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    next();
  };
}

/**
 * Strict limiter for sensitive authentication endpoints (Login, Register, Forgot Password)
 * Max 20 requests per 10 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please wait 10 minutes before trying again.',
});

/**
 * Global API limiter to prevent flood attacks
 * Max 300 requests per minute per IP
 */
export const globalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Request rate limit exceeded. Please slow down.',
});
