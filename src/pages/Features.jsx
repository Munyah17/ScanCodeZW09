import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const CORE_FEATURES = [
  {
    icon: 'fas fa-barcode',
    color: '#4f46e5',
    bg: '#e0e7ff',
    title: 'EAN-13 & UPC-A Barcode Generation',
    desc: 'Generate industry-standard EAN-13 barcodes with Zimbabwe\'s GS1 prefix (977) baked in. Every barcode includes a mathematically verified check digit, ensuring compatibility with all retail scanning systems worldwide.',
    points: ['13-digit GS1-compliant structure', 'Automatic check digit calculation', 'Supports 12 country standards', 'UPC-A, Code128, QR Code formats'],
  },
  {
    icon: 'fas fa-layer-group',
    color: '#10b981',
    bg: '#d1fae5',
    title: 'Multiple Product Variations',
    desc: 'One product, many variations — each with its own unique barcode. Whether you sell peppers in 200g, 500g, red, or green, every SKU gets a distinct, scannable code that supermarket inventory systems can track individually.',
    points: ['Weight variations (200g, 500g, 1kg…)', 'Volume variations (250ml, 500ml, 1L…)', 'Flavor, color & packaging variants', 'Mixture and custom variation types'],
  },
  {
    icon: 'fas fa-qrcode',
    color: '#f59e0b',
    bg: '#fef3c7',
    title: 'QR Code Generation',
    desc: 'Every barcode can be paired with a QR code in a single generation step. QR codes are smartphone-scannable and encode product information, making them perfect for traceability, digital menus, or linking to product detail pages.',
    points: ['Generated alongside EAN-13 barcodes', '200×200px high-density encoding', 'Scannable by all modern smartphones', 'Download separately or alongside PNG'],
  },
  {
    icon: 'fas fa-download',
    color: '#ef4444',
    bg: '#fee2e2',
    title: 'Professional Export Formats',
    desc: 'Download your barcodes at print-ready resolution. The PNG export is locked to 38mm @ 300 DPI — the GS1 specification for retail barcodes — so you can hand the file straight to a printer or packaging designer.',
    points: ['PNG at 38mm / 300 DPI (GS1 spec)', 'PDF export on A4 paper, centred', 'Print directly from the browser', 'Copy barcode number to clipboard'],
  },
  {
    icon: 'fas fa-globe',
    color: '#8b5cf6',
    bg: '#ede9fe',
    title: 'Country-Specific Standards',
    desc: 'ScanCodeZW supports barcode standards for 12 countries. Select your market and the correct GS1 prefix and format is applied automatically. Zimbabwe, South Africa, the USA, the EU, and more are all covered out of the box.',
    points: ['Zimbabwe EAN-13 (prefix 977)', 'South Africa EAN-13 (prefix 600)', 'USA/Canada UPC-A (prefix 0)', 'EU, UK, AU, NZ, KE, NG, GH, TZ, ZM'],
  },
  {
    icon: 'fas fa-chart-line',
    color: '#06b6d4',
    bg: '#cffafe',
    title: 'Product & Barcode Dashboard',
    desc: 'A clean dashboard gives you an at-a-glance view of every product and variation you\'ve created. See barcode counts, recently generated codes, and subscription usage — all without leaving the app.',
    points: ['Product and variation inventory', 'Recent barcode activity feed', 'Subscription limit tracking', 'One-click variation viewing'],
  },
  {
    icon: 'fas fa-mobile-alt',
    color: '#f97316',
    bg: '#ffedd5',
    title: 'Fully Responsive & Mobile-Ready',
    desc: 'Generate and manage barcodes from any device. The interface adapts from desktop to tablet to phone so you can work from your warehouse, market stall, or office without needing a separate app.',
    points: ['Works on desktop, tablet, and phone', 'No app installation required', 'Browser-based — always up to date', 'Stable on low-bandwidth connections'],
  },
  {
    icon: 'fas fa-shield-alt',
    color: '#64748b',
    bg: '#f1f5f9',
    title: 'Secure Account & Data Storage',
    desc: 'Your product catalogue and barcode history are stored securely and tied to your account. No other user can view or modify your products. Admin oversight is separated from client access at the routing level.',
    points: ['Session-based authentication', 'Role-separated admin / client access', 'No shared product visibility', 'Data persisted across sessions'],
  },
];

const USE_CASES = [
  { icon: 'fas fa-seedling', title: 'Horticulture Farmers', desc: 'Tag every weight and colour variant of your produce — 200g red pepper, 500g green pepper — so supermarkets can scan and track each SKU individually.' },
  { icon: 'fas fa-store', title: 'Small Retailers', desc: 'Label your own-brand products with a valid EAN-13 barcode before placing them on shelves, eliminating manual stock counting errors.' },
  { icon: 'fas fa-industry', title: 'Small Manufacturers', desc: 'Assign a unique barcode to each SKU you produce. From flavoured snacks to packaged goods, every variation gets its own scannable identity.' },
  { icon: 'fas fa-truck', title: 'Distributors & Exporters', desc: 'Generate barcodes compliant with the destination country\'s GS1 standard. Exporting to South Africa? Switch to the ZA prefix in one click.' },
];

export default function Features() {
  return (
    <Layout>
      <main className="features-page">

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-label"><i className="fas fa-star"></i> Platform Features</span>
            <h1>Everything you need to manage product barcodes</h1>
            <p>ScanCodeZW packs professional-grade barcode generation, multi-variation management, and GS1-compliant exports into a single, easy-to-use platform.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
              <Link to="/pricing" className="btn btn-outline btn-lg">View Pricing</Link>
            </div>
          </div>
        </section>

        {/* Feature stats strip */}
        <section className="feature-stats-strip">
          <div className="feature-stat"><strong>12</strong><span>Country Standards</span></div>
          <div className="feature-stat"><strong>4</strong><span>Barcode Formats</span></div>
          <div className="feature-stat"><strong>300 DPI</strong><span>Print Resolution</span></div>
          <div className="feature-stat"><strong>38mm</strong><span>GS1 Export Width</span></div>
        </section>

        {/* Core features grid */}
        <section className="core-features-section">
          <h2>Core Capabilities</h2>
          <p className="section-subtitle">Built for Zimbabwean producers and retailers — works globally</p>
          <div className="core-features-grid">
            {CORE_FEATURES.map(f => (
              <div key={f.title} className="core-feature-card">
                <div className="core-feature-icon" style={{ backgroundColor: f.bg, color: f.color }}>
                  <i className={f.icon}></i>
                </div>
                <div className="core-feature-body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <ul className="feature-points">
                    {f.points.map(p => (
                      <li key={p}><i className="fas fa-check-circle" style={{ color: f.color }}></i> {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="use-cases-section">
          <h2>Who uses ScanCodeZW?</h2>
          <p className="section-subtitle">Designed for businesses that need real barcodes, not just demos</p>
          <div className="use-cases-grid">
            {USE_CASES.map(u => (
              <div key={u.title} className="use-case-card">
                <i className={u.icon}></i>
                <h3>{u.title}</h3>
                <p>{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Barcode format comparison */}
        <section className="format-comparison-section">
          <h2>Supported Barcode Formats</h2>
          <p className="section-subtitle">All formats meet GS1 international standards</p>
          <div className="format-table-container">
            <table className="format-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Digits</th>
                  <th>Primary Use</th>
                  <th>Markets</th>
                  <th>Check Digit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="highlighted-row">
                  <td><strong>EAN-13</strong></td>
                  <td>13</td>
                  <td>Retail products, produce</td>
                  <td>Zimbabwe, Africa, Europe, Global</td>
                  <td><i className="fas fa-check text-success"></i> Yes</td>
                </tr>
                <tr>
                  <td><strong>UPC-A</strong></td>
                  <td>12</td>
                  <td>Retail products</td>
                  <td>USA, Canada</td>
                  <td><i className="fas fa-check text-success"></i> Yes</td>
                </tr>
                <tr>
                  <td><strong>Code 128</strong></td>
                  <td>Variable</td>
                  <td>Logistics, warehousing</td>
                  <td>Global</td>
                  <td><i className="fas fa-check text-success"></i> Yes</td>
                </tr>
                <tr>
                  <td><strong>QR Code</strong></td>
                  <td>Variable</td>
                  <td>Smartphone scanning, traceability</td>
                  <td>Global</td>
                  <td><i className="fas fa-check text-success"></i> Error correction</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="features-cta">
          <h2>Ready to start generating?</h2>
          <p>Create your free account and generate your first barcode in under two minutes.</p>
          <div className="cta-buttons" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
            <Link to="/pricing" className="btn btn-outline btn-lg">Compare Plans</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
