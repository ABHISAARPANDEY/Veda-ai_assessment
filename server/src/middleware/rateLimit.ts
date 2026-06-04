import rateLimit from "express-rate-limit";

// 10 requests per 15 minutes per IP — meant for auth and other expensive endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a few minutes." },
});

// 30 requests per minute per IP — general API rate limit
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
