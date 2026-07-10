/**
 * Dev API server — serves the api/ catch-all function locally on the port the
 * Vite proxy targets (vite.config.js proxies /api → localhost:3042).
 *
 * It invokes the exact same Node-style handler that Vercel runs in production
 * (api/[...path].js), so local behaviour matches the deployed API.
 *
 * Usage:  npm run dev:api     (alongside `npm run dev` in another terminal)
 */

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import http from 'http';

// Load .env (real keys live here; .env.example holds placeholders only)
if (existsSync('.env')) {
  dotenvConfig({ path: '.env', override: true });
}

const diag = {
  SUPABASE_URL:          process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 30) + '…' : 'MISSING',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
  STRIPE_SECRET_KEY:     process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.slice(0, 10) + '…' : 'MISSING',
  PAYNOW_INTEGRATION_ID: process.env.PAYNOW_INTEGRATION_ID || 'MISSING',
};
console.log('[dev-api] Environment loaded:', diag);

const { default: handler } = await import('../api/index.js');

const PORT = Number(process.env.DEV_API_PORT) || 3042;

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`[dev-api] ${req.method} ${req.url} → ${res.statusCode} (${Date.now() - started}ms)`);
  });
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[dev-api] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] API server running on http://localhost:${PORT}`);
  console.log('[dev-api] All /api/* routes are dispatched through api/[...path].js');
});