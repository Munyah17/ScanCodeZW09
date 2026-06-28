import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const FEATURES = [
  { icon: 'fas fa-barcode',    title: 'EAN-13 & UPC-A Barcodes',      desc: 'Generate GS1-compliant barcodes for every product variation. Correct check digits, correct prefixes.' },
  { icon: 'fas fa-globe',      title: 'Country-Specific Standards',    desc: 'Supports 18+ country barcode standards including Zimbabwe, South Africa, Kenya, UK, and USA.' },
  { icon: 'fas fa-layer-group', title: 'Multiple Variations',          desc: 'One product, many variations — weight, volume, flavor, colour. Each gets its own unique barcode.' },
  { icon: 'fas fa-download',   title: 'PNG, PDF & Print Ready',        desc: 'Download at 38mm / 300 DPI — exactly the GS1 retail specification. Ready for packaging.' },
  { icon: 'fas fa-key',        title: 'REST API Access',               desc: 'Connect your POS, Shopify, or ERP via our REST API. Read and write barcodes programmatically.' },
  { icon: 'fas fa-shield-alt', title: 'Secure & Compliant',            desc: 'All barcodes are stored securely. Role-based access, audit logs, and GS1 compliance built in.' },
];

const PLANS = [
  {
    name: 'Starter', price: '5.90', popular: false,
    features: ['3 products', '3 variations / product', 'EAN-13 & UPC-A', 'QR code generation', 'PNG & PDF downloads', 'Email support'],
  },
  {
    name: 'Business', price: '16.90', popular: true,
    features: ['20 products', '15 variations / product', 'All barcode formats', 'Custom branding on exports', 'Priority email support', 'Advanced exports'],
  },
  {
    name: 'Pro', price: '29.90', popular: false,
    features: ['100 products', '50 variations / product', 'All formats + API access', '24/7 phone & email support', 'Advanced analytics', 'Multi-country switching'],
  },
];

export default function Landing() {
  return (
    <Layout>
      <main className="landing-page">

        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-badge">
            <span></span>
            EAN-13 · UPC-A · QR Codes · API Access
          </div>
          <h1>Professional barcodes for every product.</h1>
          <p className="subtitle">
            Generate GS1-compliant barcodes for your entire product catalogue.
            Built for farmers, retailers, and manufacturers across Zimbabwe and beyond.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
            <Link to="/pricing"  className="btn btn-outline btn-lg">View Pricing</Link>
          </div>
        </section>

        {/* ── Wide banner 1 ── */}
        <div className="brand-banner-strip">
          <img src="/assets/brand/banner-wide-1.png" alt="ScanCodeBQR platform" />
        </div>

        {/* ── Features ── */}
        <section id="features" className="features-section">
          <h2>Everything you need.</h2>
          <p className="section-subtitle">One platform to manage product barcodes from generation to retail shelf.</p>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon"><i className={f.icon}></i></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Wide banner 2 ── */}
        <div className="brand-banner-strip">
          <img src="/assets/brand/banner-wide-2.png" alt="Create, Customize, Print barcodes instantly" />
        </div>

        {/* ── Pricing ── */}
        <section id="pricing" className="pricing-section">
          <h2>Simple, transparent pricing.</h2>
          <p className="section-subtitle">No hidden fees. No long-term contracts. Upgrade whenever you need more.</p>
          <div className="pricing-grid">
            {PLANS.map(plan => (
              <div key={plan.name} className={`pricing-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <div className="price">${plan.price}<span>/month</span></div>
                </div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}><i className="fas fa-check"></i> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`btn btn-block${plan.popular ? ' btn-outline' : ''}`}
                  style={plan.popular ? { borderColor: 'rgba(255,255,255,0.4)', color: 'black' } : {}}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <div className="extra-plans-grid">
            <div className="extra-plan-card extra-plan-enterprise">
              <div className="extra-plan-icon"><i className="fas fa-sitemap"></i></div>
              <h3>Enterprise Plan</h3>
              <p className="extra-plan-tag">Custom Solution</p>
              <p className="extra-plan-desc">Built for businesses with special needs. Unlimited products, white-label branding, full API access, on-premise deployment, and a dedicated account manager.</p>
              <ul className="extra-plan-features">
                <li><i className="fas fa-check"></i> Unlimited products &amp; variations</li>
                <li><i className="fas fa-check"></i> White-label &amp; custom branding</li>
                <li><i className="fas fa-check"></i> On-premise deployment option</li>
                <li><i className="fas fa-check"></i> Dedicated account manager</li>
                <li><i className="fas fa-check"></i> SLA &amp; priority support</li>
              </ul>
              <Link to="/pricing#enterprise" className="btn btn-block btn-outline" style={{ marginTop: 'auto' }}>Contact Sales</Link>
            </div>

            <div className="extra-plan-card extra-plan-lifetime">
              <div className="extra-plan-icon"><i className="fas fa-gem"></i></div>
              <h3>Lifetime Access</h3>
              <p className="extra-plan-tag">One-Off Payment</p>
              <div className="extra-plan-price">$99 <span>once</span></div>
              <p className="extra-plan-desc">Pay once, use forever. Everything in the Business plan — no recurring fees, no expiry.</p>
              <ul className="extra-plan-features">
                <li><i className="fas fa-check"></i> All Business plan features</li>
                <li><i className="fas fa-check"></i> Lifetime updates included</li>
                <li><i className="fas fa-check"></i> No monthly subscription</li>
                <li><i className="fas fa-check"></i> Priority email support</li>
                <li><i className="fas fa-check"></i> Unlimited barcode exports</li>
              </ul>
              <Link to="/register" className="btn btn-block btn-primary" style={{ marginTop: 'auto' }}>Get Lifetime Access</Link>
            </div>
          </div>
        </section>

        {/* ── Use case ── */}
        <section className="use-case-section">
          <img
            src="/assets/brand/banner-dashboard.png"
            alt="ScanCodeBQR dashboard — all in one platform"
            className="brand-dashboard-img"
          />
          <div style={{ maxWidth: 700, margin: '2rem auto 0', textAlign: 'center' }}>
            <div className="hero-badge" style={{ justifyContent: 'center' }}>
              <span></span> Real-world example
            </div>
            <h2>Built for horticulture &amp; retail.</h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              A pepper supplier creates one product — <strong>Peppers</strong> — and generates unique barcodes for
              200g Green, 200g Red, 500g Green, and 500g Red packs. Each barcode is retailer-ready in seconds.
            </p>
            <Link to="/register" className="btn btn-primary btn-lg">Start Generating Barcodes</Link>
          </div>
        </section>

      </main>
    </Layout>
  );
}
