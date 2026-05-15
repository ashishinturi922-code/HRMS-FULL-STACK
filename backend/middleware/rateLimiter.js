const rateLimit = require('express-rate-limit');

/**
 * loginLimiter — Fix #6
 * Prevents brute-force attacks on the login endpoint.
 * Allows 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,   // 15 minutes
    max:              10,                // max 10 attempts per window per IP
    standardHeaders:  true,             // return rate limit info in RateLimit-* headers
    legacyHeaders:    false,
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true        // only count failed attempts toward the limit
});

/**
 * generalLimiter — broad API protection
 * 300 requests per minute per IP — prevents scripted scraping / DoS on other routes.
 */
const generalLimiter = rateLimit({
    windowMs:        60 * 1000,         // 1 minute
    max:             300,
    standardHeaders: true,
    legacyHeaders:   false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.'
    }
});

module.exports = { loginLimiter, generalLimiter };
