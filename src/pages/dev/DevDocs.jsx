import DevPortalLayout from './DevPortalLayout';

const BASE = 'https://developers.scancodezw.co.zw';

function Code({ children, lang = '' }) {
  return (
    <pre style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '1rem', overflowX: 'auto', fontSize: '0.78rem', lineHeight: 1.6, margin: '0.5rem 0 1rem', color: '#c9d1d9', fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace" }}>
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ color: '#f0f6fc', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #30363d' }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return <p style={{ color: '#8b949e', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>{children}</p>;
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ background: '#21262d' }}>
            {headers.map(h => <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '0.5rem 0.75rem', color: '#c9d1d9', fontFamily: j === 0 ? 'monospace' : 'inherit', fontSize: j === 0 ? '0.75rem' : 'inherit' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DevDocs() {
  return (
    <DevPortalLayout title="API Documentation">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '2rem', alignItems: 'start' }}>
        {/* Docs body */}
        <div>

          <Section id="overview" title="Overview">
            <P>
              The ScanCodeZW Developer API gives your applications access to our barcode and QR code generation engine.
              The API is an extension of the main platform — all barcodes are stored in your ScanCodeZW account and accessible from both the web portal and the API.
            </P>
            <P>Base URL: <code style={{ color: '#58a6ff', background: '#21262d', padding: '0.1rem 0.35rem', borderRadius: 4 }}>{BASE}/api/v1</code></P>
          </Section>

          <Section id="auth" title="Authentication">
            <P>Every request requires an API key in the <code style={{ color: '#58a6ff', background: '#21262d', padding: '0.1rem 0.35rem', borderRadius: 4 }}>X-API-Key</code> header. Generate keys in the <a href="/dev/keys" style={{ color: '#58a6ff' }}>Keys</a> page.</P>
            <Code>{`GET /api/v1/barcodes/list
X-API-Key: scz_live_your_key_here`}</Code>
          </Section>

          <Section id="environments" title="Environments">
            <P>Each key is tied to one environment:</P>
            <Table
              headers={['Environment', 'Key Prefix', 'Behaviour']}
              rows={[
                ['sandbox', 'scz_test_…', 'Free testing. Returns clearly-marked test data. Nothing saved to DB. No wallet deductions.'],
                ['live',    'scz_live_…', 'Real barcodes saved to your account. Wallet deducted per successful operation.'],
              ]}
            />
          </Section>

          <Section id="wallet" title="Wallet Billing">
            <P>Live API calls use a prepaid wallet model. Top up via the <a href="/dev/wallet" style={{ color: '#58a6ff' }}>Wallet</a> page. If your balance reaches $0, the API returns 402 until you add funds.</P>
            <Table
              headers={['Operation', 'Cost (USD)', 'Notes']}
              rows={[
                ['barcode:generate (single)',   '$0.001',  '1 EAN-13 or UPC-A barcode'],
                ['barcode:generate (bulk >10)', '$0.0008', 'Per barcode in a bulk call'],
                ['qr:generate (single)',        '$0.001',  '1 QR code PNG (base64)'],
                ['qr:generate (bulk >10)',      '$0.0008', 'Per QR in a bulk call'],
                ['barcode:list',                'Free',    'Paginated read of your barcodes'],
                ['products:read',               'Free',    'Paginated read of your products'],
              ]}
            />
            <P>Insufficient balance error:</P>
            <Code>{`HTTP 402
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Please top up your wallet.",
  "balance": 0.0003,
  "required": 0.001,
  "top_up_url": "https://developers.scancodezw.co.zw/wallet"
}`}</Code>
          </Section>

          <Section id="generate" title="POST /api/v1/barcodes/generate">
            <P>Generate a single EAN-13 or UPC-A barcode. Saved to your account under the specified product.</P>
            <Code>{`POST /api/v1/barcodes/generate
X-API-Key: scz_live_your_key_here
Content-Type: application/json

{
  "product_id": 42,           // optional — uses "API Default" product if omitted
  "country": "ZW",            // ZW|ZA|NG|KE|GH|TZ|ZM|US|CA|EU|UK|AU|JP|CN|IN|MX|BR
  "variation_type": "size",
  "variation_value": "500ml",
  "include_qr": false         // set true to get a QR PNG alongside
}`}</Code>
            <P>Response:</P>
            <Code>{`{
  "success": true,
  "environment": "live",
  "barcode": {
    "id": 1091,
    "code": "9771234567890",
    "format": "EAN-13",
    "country": "ZW",
    "variation_type": "size",
    "variation_value": "500ml",
    "product_id": 42,
    "qr_data_url": null
  },
  "billing": {
    "cost": 0.001,
    "balance": 49.999
  }
}`}</Code>
          </Section>

          <Section id="bulk" title="POST /api/v1/barcodes/bulk">
            <P>Generate up to 100 barcodes in one call. Bulk rate ($0.0008) applies when count &gt; 10.</P>
            <Code>{`POST /api/v1/barcodes/bulk
X-API-Key: scz_live_your_key_here
Content-Type: application/json

{
  "items": [
    { "country": "ZW", "variation_type": "size", "variation_value": "250ml" },
    { "country": "ZW", "variation_type": "size", "variation_value": "500ml" },
    { "country": "ZW", "variation_type": "colour", "variation_value": "Red" }
  ],
  "include_qr": false
}`}</Code>
          </Section>

          <Section id="qr" title="POST /api/v1/qr/generate">
            <P>Generate a QR code for any string (URL, product code, plain text). Returns a base64 PNG data URL.</P>
            <Code>{`POST /api/v1/qr/generate
X-API-Key: scz_live_your_key_here
Content-Type: application/json

{
  "data": "https://your-site.co.zw/product/123",
  "error_correction": "M",   // L | M | Q | H
  "size": 256                // pixels, 64–1024
}`}</Code>
            <P>Response:</P>
            <Code>{`{
  "success": true,
  "environment": "live",
  "qr": {
    "data_url": "data:image/png;base64,iVBORw0...",
    "encoded_data": "https://your-site.co.zw/product/123",
    "error_correction": "M",
    "size": 256
  },
  "billing": { "cost": 0.001, "balance": 49.998 }
}`}</Code>
          </Section>

          <Section id="list" title="GET /api/v1/barcodes/list">
            <P>Paginate your stored barcodes. Free.</P>
            <Code>{`GET /api/v1/barcodes/list?limit=50&offset=0&product_id=42
X-API-Key: scz_live_your_key_here`}</Code>
          </Section>

          <Section id="products" title="GET /api/v1/products/list">
            <P>Paginate your products. Free.</P>
            <Code>{`GET /api/v1/products/list?limit=50&offset=0
X-API-Key: scz_live_your_key_here`}</Code>
          </Section>

          <Section id="errors" title="Error Reference">
            <Table
              headers={['HTTP', 'error code', 'Meaning']}
              rows={[
                ['401', 'MISSING_KEY',         'No X-API-Key header provided'],
                ['401', 'INVALID_KEY',          'Key not found'],
                ['401', 'KEY_REVOKED',          'Key was revoked'],
                ['402', 'INSUFFICIENT_BALANCE', 'Wallet balance too low — top up required'],
                ['402', 'WALLET_NOT_FOUND',     'Developer wallet not set up yet'],
                ['403', 'INSUFFICIENT_SCOPE',   'Key does not have the required scope'],
                ['400', 'validation error',     'Missing or invalid request body field'],
                ['500', 'DB_ERROR',             'Internal error — retry or contact support'],
              ]}
            />
          </Section>

          <Section id="example" title="Quick-start Example (Node.js)">
            <Code>{`// npm install node-fetch (Node 16 and below)
// native fetch is available in Node 18+

const API_KEY = 'scz_live_your_key_here';
const BASE    = 'https://developers.scancodezw.co.zw';

async function generateBarcode(variationType, variationValue) {
  const res = await fetch(\`\${BASE}/api/v1/barcodes/generate\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      country: 'ZW',
      variation_type: variationType,
      variation_value: variationValue,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'INSUFFICIENT_BALANCE') {
      console.error('Top up your wallet:', err.top_up_url);
    }
    throw new Error(err.message ?? 'API error');
  }

  const { barcode, billing } = await res.json();
  console.log('Barcode:', barcode.code);           // "9771234567890"
  console.log('Remaining balance:', billing.balance);
  return barcode;
}

generateBarcode('size', '500ml').then(console.log);`}</Code>
          </Section>

        </div>

        {/* TOC */}
        <nav style={{ position: 'sticky', top: '1rem', fontSize: '0.78rem', lineHeight: 2 }}>
          <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>On this page</div>
          {[
            ['#overview',     'Overview'],
            ['#auth',         'Authentication'],
            ['#environments', 'Environments'],
            ['#wallet',       'Wallet Billing'],
            ['#generate',     'Barcode Generate'],
            ['#bulk',         'Barcode Bulk'],
            ['#qr',           'QR Generate'],
            ['#list',         'List Barcodes'],
            ['#products',     'List Products'],
            ['#errors',       'Error Reference'],
            ['#example',      'Quick Start'],
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ display: 'block', color: '#8b949e', textDecoration: 'none', padding: '0.1rem 0' }}>{label}</a>
          ))}
        </nav>
      </div>
    </DevPortalLayout>
  );
}
