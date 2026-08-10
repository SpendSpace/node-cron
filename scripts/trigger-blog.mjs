/**
 * Manual trigger + diagnostic for the blog generation workflow
 * Run this inside the cron container (railway ssh) so CRON_SECRET and
 * OPENROUTER_API_KEY come from the service environment:
 *
 *   node scripts/trigger-blog.mjs
 *
 * Progress goes to stderr; a single JSON report goes to stdout, so
 * `node scripts/trigger-blog.mjs 2>/dev/null` gives clean JSON.
 *
 * Why this exists: POST /trigger/blog awaits runBlogGeneration(), which
 * swallows every internal failure -- a missing API key, a rejected OpenRouter
 * call and a 409 slug collision all return {success: true}. So the endpoint
 * response alone cannot tell you whether a post was actually created. This
 * checks the upstream dependencies directly before triggering.
 *
 * Secrets are only ever reported as character counts.
 */

const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Must match callOpenRouter() in src/index.ts
const MODEL = "anthropic/claude-haiku-4-5";

const progress = (msg) => process.stderr.write(`${msg}\n`);

const report = {
  startedAt: new Date().toISOString(),
  env: {
    port: PORT,
    cronSecretChars: CRON_SECRET?.length ?? 0,
    openRouterKeyChars: OPENROUTER_API_KEY?.length ?? 0,
    apiUrl: process.env.API_URL || null,
    blogAdminEmail: process.env.BLOG_ADMIN_EMAIL || null,
  },
  health: null,
  openRouter: null,
  trigger: null,
  diagnosis: null,
};

/**
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Object>} { ok, status, body } or { error }
 */
async function request(url, options = {}, timeoutMs = 120000) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 300);
    }
    return { ok: response.ok, status: response.status, ms: Date.now() - started, body };
  } catch (error) {
    return { error: error.name === "TimeoutError" ? "timeout" : error.message, ms: Date.now() - started };
  }
}

// 1. Is the cron service actually up? If this fails, nothing else matters --
//    a stopped service is the whole explanation.
progress("[1/3] checking cron service health...");
report.health = await request(`http://localhost:${PORT}/health`, {}, 10000);

// 2. Is the OpenRouter key valid and in credit? This endpoint reports usage and
//    limit, which distinguishes "key revoked" from "key fine but out of money".
if (OPENROUTER_API_KEY) {
  progress("[2/3] checking OpenRouter key status...");
  const key = await request(
    "https://openrouter.ai/api/v1/key",
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } },
    20000,
  );
  report.openRouter = {
    keyCheck: { ok: key.ok, status: key.status, ...(key.error ? { error: key.error } : {}) },
    // Deliberately omits `label`, which echoes fragments of the key itself.
    usage: key.body?.data
      ? {
          usage: key.body.data.usage ?? null,
          limit: key.body.data.limit ?? null,
          limitRemaining: key.body.data.limit_remaining ?? null,
          isFreeTier: key.body.data.is_free_tier ?? null,
        }
      : null,
    model: MODEL,
  };
} else {
  report.openRouter = { keyCheck: { ok: false, error: "OPENROUTER_API_KEY not set" } };
}

// 3. Trigger the real workflow. Generation calls an LLM with max_tokens 8192,
//    so allow well past the default fetch timeout.
if (!CRON_SECRET) {
  report.trigger = { skipped: "CRON_SECRET not set; cannot authenticate to /trigger/blog" };
} else if (report.health?.error) {
  report.trigger = { skipped: "cron service did not respond to /health" };
} else {
  progress("[3/3] triggering blog generation (LLM call, expect 30-90s)...");
  report.trigger = await request(
    `http://localhost:${PORT}/trigger/blog`,
    { method: "POST", headers: { "x-cron-secret": CRON_SECRET } },
    180000,
  );
}

// Diagnosis. Ordered so the most upstream failure wins.
const remaining = report.openRouter?.usage?.limitRemaining;

if (report.health?.error) {
  report.diagnosis =
    "Cron service is not responding on localhost:" +
    PORT +
    ". The service is down or never started -- check the deploy logs. This alone explains the stopped schedule.";
} else if (!report.env.openRouterKeyChars) {
  report.diagnosis = "OPENROUTER_API_KEY is not set on the cron service. runBlogGeneration() returns early without generating.";
} else if (report.openRouter?.keyCheck?.status === 401) {
  report.diagnosis = "OpenRouter rejected the key (401). It was revoked or rotated.";
} else if (typeof remaining === "number" && remaining <= 0) {
  report.diagnosis = "OpenRouter key is valid but out of credit (limit_remaining <= 0). Generation fails at the LLM call and is swallowed by the catch in generateBlogPost().";
} else if (report.trigger?.ok) {
  report.diagnosis =
    "Trigger returned success, but that is reported even when generation or storage failed. Confirm a row actually landed:  SELECT slug, status, created_at FROM blog_drafts ORDER BY created_at DESC LIMIT 3;  If no new row, check the service logs for 'Draft storage failed' (409 slug collision) or 'Blog generation error'.";
} else {
  report.diagnosis = "Trigger did not succeed; see the trigger block for status and body.";
}

console.log(JSON.stringify(report, null, 2));
