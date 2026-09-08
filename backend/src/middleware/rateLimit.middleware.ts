import rateLimit from "express-rate-limit";

// Baseline DoS/abuse guard applied to every /api request (see app.ts) — high
// enough that a real page load's burst of parallel calls never trips it, low
// enough to blunt scripted scraping/flooding. authRateLimit below stacks on
// top of this with a much tighter budget for the sensitive auth endpoints.
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please slow down" } },
});

// Factory, not one shared export — each call below produces its own
// independent limiter (its own in-memory counter), so unrelated auth
// actions never draw against the same per-IP budget. Before this, a single
// `authRateLimit` instance was reused across register/login/forgot-password/
// reset-password/verify-email/both OAuth providers/change-password — a
// legitimate user who mistyped their password a few times, then tried
// Google login, then requested a password reset, all from one network,
// could exhaust that one shared 20-per-15-min bucket and get a generic 429
// on an action they hadn't actually abused.
function createAuthRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: "Too many attempts, please try again later" } },
  });
}

// One independent limiter per logical action group. forgot-password and
// reset-password share `passwordResetRateLimit` (one real flow, two
// requests); the 4 OAuth routes share `oauthRateLimit` (they never take
// user-supplied credentials directly, so contending with each other is
// low-risk — the callback exchanging a code is what actually matters).
export const loginRateLimit = createAuthRateLimit();
export const registerRateLimit = createAuthRateLimit();
export const passwordResetRateLimit = createAuthRateLimit();
export const emailVerificationRateLimit = createAuthRateLimit();
export const oauthRateLimit = createAuthRateLimit();
export const changePasswordRateLimit = createAuthRateLimit();

// Checkout preview/place both accept a free-typed promoCode — without this,
// a logged-in account could brute-force short/guessable codes at
// globalRateLimit's full 300/min. Budgeted for real interactive use
// (toggling fulfillment method/address/bank/delivery speed each re-fires a
// preview) while still meaningfully capping scripted guessing.
export const checkoutRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please slow down" } },
});

// Authenticated but still self-service and email-sending — caps how often
// a signed-in-but-unverified account can trigger a resend.
export const resendVerificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please try again later" } },
});

// Public, unauthenticated, and triggers an outbound email per call — without
// this, POST /newsletter/subscribe could be used to spam arbitrary inboxes
// with confirmation emails at globalRateLimit's full 300/min.
export const newsletterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please try again later" } },
});

// Image-upload routes (bank logos, etc.) sit behind requireRole(ADMIN)
// already, so this is a second line of defense against a compromised admin
// session being used to flood disk writes — generous enough for a normal
// admin session setting up/editing several records in a row.
export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many uploads, please slow down" } },
});
