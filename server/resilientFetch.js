const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A request is safe to retry if it is a GET, or a POST that carries an
// Idempotency-Key (the partner replays the original result for the same key).
function isRetryable(options) {
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') return true;
  const headers = options.headers || {};
  return method === 'POST' && Boolean(headers['Idempotency-Key']);
}

async function fetchWithRetry(url, options = {}, config = {}) {
  const { timeoutMs = 1500, retries = 2, delayMs = 200 } = config;
  const maxRetries = isRetryable(options) ? retries : 0; // never retry unsafe writes

  for (let attempt = 0; ; attempt++) {
    let wait = delayMs * 2 ** attempt; // 200 ms, then 400 ms
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!RETRY_STATUSES.has(res.status) || attempt >= maxRetries) return res;
      const retryAfter = Number(res.headers.get('Retry-After'));
      if (res.status === 429 && retryAfter > 0) {
        wait = Math.min(retryAfter * 1000, 5000); // wait as asked, up to 5 s
      }
    } catch (err) {
      if (attempt >= maxRetries) throw err; // out of retries
    }
    console.warn(`attempt ${attempt + 1} failed, retrying in ${wait} ms`);
    await sleep(wait);
  }
}

module.exports = { fetchWithRetry };