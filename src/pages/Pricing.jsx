import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { VisaLogo, MastercardLogo, AmexLogo, EcoCashLogo, OneMoneyLogo, InnBucksLogo, ZipitLogo } from '../components/PaymentLogos';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '5.90',
    popular: false,
    desc: 'Perfect for sole traders and micro-businesses getting started with barcoding.',
    features: [
      '3 products',
      '3 variations / product',
      'EAN-13 & UPC-A',
      'QR code generation',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Email support',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '16.90',
    popular: true,
    desc: 'The go-to plan for growing farms and retailers managing multiple product lines.',
    features: [
      '20 products',
      '15 variations / product',
      'All barcode formats (EAN-13, UPC-A, Code128, QR)',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Custom branding on exports',
      'Priority email support',
      'Advanced export options',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '29.90',
    popular: false,
    desc: 'For established businesses with large catalogues and multi-country requirements.',
    features: [
      '100 products',
      '50 variations / product',
      'All formats + API access',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Custom branding on exports',
      '24/7 phone & email support',
      'Advanced analytics dashboard',
      'Multi-country standard switching',
    ],
  },
];

const FAQ = [
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes. You can switch plans at any time from your account settings. Changes take effect immediately.' },
  { q: 'Are the barcodes GS1-compliant?', a: 'Yes. All EAN-13 barcodes are generated using the correct GS1 prefix for your selected country and include a mathematically verified check digit.' },
  { q: 'What image resolution do I get?', a: 'PNG exports are locked to 38mm wide at 300 DPI — the GS1 specification for retail barcodes. This ensures they scan correctly on packaging.' },
  { q: 'Do I need to install anything?', a: 'No. ScanCodeZW runs entirely in your browser. No app, no plugin, no download required.' },
  { q: "What's the difference between EAN-13 and UPC-A?", a: 'EAN-13 is the standard used in Zimbabwe, Africa, and Europe (13 digits). UPC-A is used in the USA and Canada (12 digits). The platform selects the right format based on your chosen country standard.' },
  { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, and American Express via Stripe, and EcoCash, OneMoney, InnBucks, and ZIPIT via Paynow.' },
  { q: 'How does One-Time Generation work?', a: 'Pay per session — $10 for a single barcode or $20 for a bundle of three. No subscription required. You pay before each generation and your credits are applied immediately. Perfect if you only need barcodes occasionally.' },
  { q: 'Is my product data secure?', a: 'Yes. Your products and barcodes are stored in your account only and are not visible to other users.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '1.25rem 0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{q}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#6b7280', fontSize: '0.8rem', flexShrink: 0 }} />
      </button>
      {open && <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7 }}>{a}</p>}
    </div>
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const go = (planKey) => navigate(user ? `/checkout?plan=${planKey}` : `/register?plan=${planKey}`);

  return (
    <Layout>
      <main>

        {/* ── Hero ── */}
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-label"><i className="fas fa-tag"></i> Pricing</span>
            <h1>Simple, transparent pricing</h1>
            <p>No hidden fees. No long-term contracts. Pick the plan that fits your business and upgrade whenever you need more.</p>
          </div>
        </section>

        {/* ── Monthly subscriptions ── */}
        <section className="pricing-section" style={{ paddingTop: 0 }}>
          <div className="pricing-grid">
            {PLANS.map(plan => (
              <div key={plan.key} className={`pricing-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <div className="price">${plan.price}<span>/month</span></div>
                  <p className="plan-desc">{plan.desc}</p>
                </div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}><i className="fas fa-check"></i> {f}</li>
                  ))}
                </ul>
                <button
                  className={`btn btn-block${plan.popular ? '' : ' btn-outline'}`}
                  onClick={() => go(plan.key)}
                >
                  Get {plan.name}
                </button>
              </div>
            ))}
          </div>

          {/* ── One-Time Generation ── */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.4rem' }}>One-Time Generation</h2>
            <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>
              No subscription needed. Pay per generation — your credits are approved instantly.
            </p>
            <div className="extra-plans-grid">
              <div className="extra-plan-card" style={{ background: 'linear-gradient(145deg, #1e293b, #162032)', borderColor: '#38bdf8' }}>
                <div className="extra-plan-icon" style={{ color: '#38bdf8' }}><i className="fas fa-barcode"></i></div>
                <h3>Single Generation</h3>
                <p className="extra-plan-tag" style={{ background: 'rgba(56,189,248,0.15)', color: '#7dd3fc' }}>Pay Per Use</p>
                <div className="extra-plan-price">$10.00 <span>/ barcode</span></div>
                <p className="extra-plan-desc">Generate one unique GS1-compliant barcode. Includes EAN-13 or UPC-A, PNG download at 38mm / 300 DPI, and QR code. Pay before each generation — no commitment.</p>
                <ul className="extra-plan-features">
                  <li><i className="fas fa-check"></i> 1 barcode generation</li>
                  <li><i className="fas fa-check"></i> EAN-13 or UPC-A format</li>
                  <li><i className="fas fa-check"></i> PNG at 38mm / 300 DPI</li>
                  <li><i className="fas fa-check"></i> QR code included</li>
                  <li><i className="fas fa-check"></i> Instant approval on payment</li>
                </ul>
                <button className="btn btn-block" style={{ marginTop: 'auto', background: '#0ea5e9', color: '#fff', border: 'none' }} onClick={() => go('otg_single')}>
                  Buy 1 Barcode — $10
                </button>
              </div>

              <div className="extra-plan-card" style={{ background: 'linear-gradient(145deg, #1e293b, #1a2510)', borderColor: '#86efac' }}>
                <div className="extra-plan-icon" style={{ color: '#86efac' }}><i className="fas fa-layer-group"></i></div>
                <h3>Bundle — 3 Barcodes</h3>
                <p className="extra-plan-tag" style={{ background: 'rgba(134,239,172,0.15)', color: '#86efac' }}>Best Value</p>
                <div className="extra-plan-price">$20.00 <span>/ 3 barcodes</span></div>
                <p className="extra-plan-desc">Generate three unique barcodes in one payment. Each barcode gets its own GS1-compliant number, PNG export, and QR code. Save $10 compared to buying individually.</p>
                <ul className="extra-plan-features">
                  <li><i className="fas fa-check"></i> 3 barcode generations</li>
                  <li><i className="fas fa-check"></i> All formats (EAN-13, UPC-A, QR)</li>
                  <li><i className="fas fa-check"></i> PNG at 38mm / 300 DPI each</li>
                  <li><i className="fas fa-check"></i> Save $10 vs buying separately</li>
                  <li><i className="fas fa-check"></i> Credits never expire</li>
                </ul>
                <button className="btn btn-block btn-primary" style={{ marginTop: 'auto' }} onClick={() => go('otg_triple')}>
                  Buy 3 Barcodes — $20
                </button>
              </div>
            </div>
          </div>

          {/* ── Lifetime + Enterprise ── */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.4rem' }}>Unlimited Plans</h2>
            <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>Pay once or get a custom solution for your organisation.</p>
            <div className="extra-plans-grid">
              <div className="extra-plan-card extra-plan-lifetime">
                <div className="extra-plan-icon"><i className="fas fa-gem"></i></div>
                <h3>Lifetime Access</h3>
                <p className="extra-plan-tag">One-Off Payment</p>
                <div className="extra-plan-price">$129.99 <span>once</span></div>
                <p className="extra-plan-desc">Pay once, use forever. Unlimited everything — no recurring fees, no expiry, no surprises.</p>
                <ul className="extra-plan-features">
                  <li><i className="fas fa-check"></i> Unlimited products &amp; variations</li>
                  <li><i className="fas fa-check"></i> All barcode formats (EAN-13, UPC-A, Code128, QR)</li>
                  <li><i className="fas fa-check"></i> Full API access</li>
                  <li><i className="fas fa-check"></i> Advanced analytics dashboard</li>
                  <li><i className="fas fa-check"></i> Priority support forever</li>
                  <li><i className="fas fa-check"></i> No monthly renewals ever</li>
                </ul>
                <button className="btn btn-block btn-primary" style={{ marginTop: 'auto' }} onClick={() => go('lifetime')}>
                  Buy Lifetime Access
                </button>
              </div>

              <div className="extra-plan-card extra-plan-enterprise">
                <div className="extra-plan-icon"><i className="fas fa-sitemap"></i></div>
                <h3>Enterprise Plan</h3>
                <p className="extra-plan-tag">Custom Solution</p>
                <p className="extra-plan-desc">
                  Built for organisations with special compliance, volume, and integration requirements.
                  Limits and features are configured individually by our team for each client.
                </p>
                <ul className="extra-plan-features">
                  <li><i className="fas fa-check"></i> Custom product &amp; variation limits</li>
                  <li><i className="fas fa-check"></i> White-label &amp; custom branding</li>
                  <li><i className="fas fa-check"></i> On-premise deployment option</li>
                  <li><i className="fas fa-check"></i> Dedicated account manager</li>
                  <li><i className="fas fa-check"></i> SLA, GDPR-ready, SOC 2 aligned</li>
                  <li><i className="fas fa-check"></i> Priority support &amp; onboarding</li>
                </ul>
                <a href="mailto:enterprise@scancodezw.co.zw" className="btn btn-block btn-outline" style={{ marginTop: 'auto' }}>
                  Contact Enterprise Sales
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>POWERED BY</span>
              <svg height={18} viewBox="0 0 60 24" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe" role="img">
                <text x="0" y="18" fontFamily="'Arial Black', Arial, sans-serif" fontSize="18" fontWeight="900" fill="#635BFF">stripe</text>
              </svg>
              <VisaLogo height={22} />
              <MastercardLogo height={22} />
              <AmexLogo height={22} />
            </div>
            <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <img src="/paynow-badge.svg" alt="Paynow" style={{ height: 22, objectFit: 'contain' }} />
              <EcoCashLogo height={22} />
              <OneMoneyLogo height={22} />
              <InnBucksLogo height={22} />
              <ZipitLogo height={22} />
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pricing-section" style={{ paddingTop: '1rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Frequently asked questions</h2>
          <p className="section-subtitle">Everything you need to know before you commit.</p>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </section>

      </main>
    </Layout>
  );
}
