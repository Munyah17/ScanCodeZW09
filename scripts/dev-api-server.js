/**
 * Dev API server — runs Netlify function handlers locally without Netlify CLI.
 * Adapts Node's IncomingMessage to a Web API Request-like object.
 *
 * Usage:  node scripts/dev-api-server.js
 *         (or npm run dev:api)
 */

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import http from 'http';
import { Readable } from 'stream';

// Load .env.example first (contains real keys), then .env for local overrides
if (existsSync('.env.example')) {
  dotenvConfig({ path: '.env.example' });
}
if (existsSync('.env')) {
  dotenvConfig({ path: '.env', override: true });
}

// ── Diagnostic: show what credentials are loaded ─────────────────────────────
const diag = {
  STRIPE_SECRET_KEY:  process.env.STRIPE_SECRET_KEY?.slice(0, 12) + '...' || 'MISSING',
  PAYNOW_INTEGRATION_ID: process.env.PAYNOW_INTEGRATION_ID || 'MISSING',
  SUPABASE_URL:       process.env.SUPABASE_URL?.slice(0, 30) + '...' || 'MISSING',
};
console.log('[dev-api] Environment loaded:', diag);

// ── Import API handlers ─────────────────────────────────────────────────────
import stripeCheckout from '../api/stripe/create-checkout-session.js';
import paynowInitiate from '../api/paynow/initiate.js';
import paynowMobile from '../api/paynow/mobile.js';
import paynowCallback from '../api/paynow/callback.js';
import stripeWebhook from '../api/stripe/webhook.js';

const HANDLERS = {
  '/api/stripe/create-checkout-session': stripeCheckout,
  '/api/paynow/initiate':               paynowInitiate,
  '/api/paynow/mobile':                 paynowMobile,
  '/api/paynow/callback':               paynowCallback,
  '/api/stripe/webhook':                stripeWebhook,
};

// ── Stripe diagnostic test route ────────────────────────────────────────────
async function testStripeHandler(req) {
  try {
    console.log('[test-stripe] Testing Stripe...');
    const key = process.env.STRIPE_SECRET_KEY;
    console.log('[test-stripe] KEY EXISTS:', !!key);
    console.log('[test-stripe] KEY PREVIEW:', key ? key.slice(0, 16) + '...' : 'MISSING');

    if (!key || key === 'sk_test_REPLACE_ME') {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY missing or placeholder' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    const prices = await stripe.prices.list({ limit: 3 });

    console.log('[test-stripe] SUCCESS');
    return new Response(JSON.stringify({ success: true, prices }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[test-stripe] FAILED:', err.message);
    console.error(err.stack);
    return new Response(JSON.stringify({
      error: err.message,
      type: err.type || null,
      stack: err.stack,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

const PREFERRED_PORT = 3042;
let PORT = PREFERRED_PORT;

// ── Helpers ─────────────────────────────────────────────────────────────────

function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function createRequest(req, bodyBuffer) {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `http://${host}${req.url}`;

  return {
    method: req.method,
    url,
    headers: {
      get(name) {
        const key = Object.keys(req.headers).find(
          (h) => h.toLowerCase() === name.toLowerCase()
        );
        return key ? req.headers[key] : null;
      },
    },
    async json() {
      const text = bodyBuffer.toString('utf-8') || '{}';
      try {
        return JSON.parse(text);
      } catch {
        return {};
      }
    },
    async text() {
      return bodyBuffer.toString('utf-8');
    },
  };
}

// ── Server ──────────────────────────────────────────────────────────────────

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(startPort, () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', () => {
      srv.listen(0, () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
    });
  });
}

async function startServer() {
  PORT = await findAvailablePort(PREFERRED_PORT);

  const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Diagnostic test route
  if (req.url === '/api/test-stripe') {
    const response = await testStripeHandler(req);
    const headers = {};
    if (response.headers) response.headers.forEach((v, k) => { headers[k] = v; });
    const text = await response.text();
    res.writeHead(response.status || 200, headers);
    res.end(text);
    return;
  }

  const handler = HANDLERS[req.url];
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: req.url }));
    return;
  }

  try {
    const bodyBuffer = await collectBody(req);
    const request = await createRequest(req, bodyBuffer);

    console.log(`[dev-api] → ${req.method} ${req.url}`);
    console.log(`[dev-api]   body:`, bodyBuffer.toString('utf-8').slice(0, 200));

    const response = await handler(request);

    const headers = {};
    if (response.headers) {
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }

    const text = await response.text();
    console.log(`[dev-api] ← ${response.status || 200} ${req.url} → ${text.slice(0, 200)}`);

    res.writeHead(response.status || 200, headers);
    res.end(text);
  } catch (err) {
    console.error('[dev-api-server] ─── ERROR ───');
    console.error('URL:', req.url);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('───────────────');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api-server] API server running on http://localhost:${PORT}`);
  console.log('[dev-api-server] Routes:');
  Object.keys(HANDLERS).forEach((r) => console.log(`  ${r}`));
});
}

startServer();
