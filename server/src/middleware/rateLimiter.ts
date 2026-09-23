import rateLimit from 'express-rate-limit';

// Standard API rate limiter: 300 requests per 15 mins
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded. Please try again later.',
  },
});

// Strict limiter for authentication endpoints: 15 attempts per 5 minutes
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts. Please wait 5 minutes before trying again.',
  },
});
