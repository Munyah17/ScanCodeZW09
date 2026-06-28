import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '4.79',
    popular: false,
    desc: 'Perfect for sole traders and micro-businesses getting started with barcoding.',
    features: [
      'Up to 3 products',
      '3 variations per product',
      'EAN-13 & UPC-A formats',
      'QR code generation',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Email support',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: '11.99',
    popular: true,
    desc: 'The go-to plan for growing farms and retailers managing multiple product lines.',
    features: [
      'Up to 20 products',
      '15 variations per product',
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
    price: '24.99',
    popular: false,
    desc: 'For established businesses with large catalogues and multi-country requirements.',
    features: [
      'Up to 100 products',
      '50 variations per product',
      'All barcode formats',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Custom branding on exports',
      '24/7 phone & email support',
      'API access',
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

        {/* ── Monthly plans ── */}
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

          {/* ── Lifetime + Enterprise wide cards ── */}
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
                We scope every engagement around your infrastructure, catalogue size, and team.
              </p>
              <ul className="extra-plan-features">
                <li><i className="fas fa-check"></i> Unlimited products &amp; variations</li>
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

          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            Pay with <strong>Stripe</strong> (Visa · Mastercard · Amex) &nbsp;or&nbsp;
            <strong> Paynow</strong> (EcoCash · OneMoney · InnBucks · ZIPIT)
          </p>
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
