import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '4.79',
    color: '#10b981',
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
    color: '#4f46e5',
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
    color: '#8b5cf6',
    desc: 'For established businesses with large catalogues and export requirements.',
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
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: '129.99',
    color: '#f59e0b',
    oneTime: true,
    desc: 'Pay once, use forever. Unlimited everything with no recurring fees.',
    features: [
      'Unlimited products',
      'Unlimited variations',
      'All barcode formats',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Custom branding on exports',
      'Priority support forever',
      'Full API access',
      'Advanced analytics dashboard',
      'No monthly renewals ever',
    ],
  },
];

const FAQ = [
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes. You can switch plans at any time from your account settings. Changes take effect immediately.' },
  { q: 'Are the barcodes GS1-compliant?', a: 'Yes. All EAN-13 barcodes are generated using the correct GS1 prefix for your selected country and include a mathematically verified check digit.' },
  { q: 'What image resolution do I get?', a: 'PNG exports are locked to 38mm wide at 300 DPI — the GS1 specification for retail barcodes. This ensures they scan correctly on packaging.' },
  { q: 'Do I need to install anything?', a: 'No. ScanCodeZW runs entirely in your browser. No app, no plugin, no download required.' },
  { q: 'What\'s the difference between EAN-13 and UPC-A?', a: 'EAN-13 is the standard used in Zimbabwe, Africa, and Europe (13 digits). UPC-A is used in the USA and Canada (12 digits). The platform selects the right format based on your chosen country standard.' },
  { q: 'Is my product data secure?', a: 'Yes. Your products and barcodes are stored in your account only and are not visible to other users.' },
  { q: 'What payment methods do you accept?', a: 'We accept Visa, Mastercard, and American Express via Stripe, plus EcoCash, OneMoney, InnBucks, and ZIPIT via Paynow.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: '1px solid #f3f4f6',
        padding: '0',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: '1.25rem 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>{q}</span>
        <span style={{ color: '#6b7280', fontSize: '1.2rem', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7 }}>{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const handleGetStarted = (planKey) => {
    navigate(user ? `/checkout?plan=${planKey}` : `/register?plan=${planKey}`);
  };

  return (
    <Layout>
      <main style={{ background: '#f9fafb', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <section style={{ background: '#fff', borderBottom: '1px solid #f3f4f6', padding: '4rem 1rem 3rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <span style={{
              display: 'inline-block', background: '#ede9fe', color: '#6d28d9',
              borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.78rem',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.25rem',
            }}>
              Pricing
            </span>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, color: '#111827', margin: '0 0 1rem', lineHeight: 1.2 }}>
              Simple, transparent pricing
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.05rem', lineHeight: 1.7, margin: 0 }}>
              No hidden fees. No long-term contracts. Pick the plan that fits your business
              and upgrade whenever you need more.
            </p>
          </div>
        </section>

        {/* ── Plan cards ── */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}>
            {PLANS.map(plan => (
              <div
                key={plan.key}
                style={{
                  background: plan.popular ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' : '#fff',
                  border: plan.popular ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: plan.popular ? '2.25rem 2rem 2rem' : '2rem',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: plan.popular ? '0 8px 32px rgba(79,70,229,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: '#4f46e5', color: '#fff', borderRadius: 999,
                    padding: '0.25rem 1rem', fontSize: '0.72rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: `1px solid ${plan.popular ? 'rgba(255,255,255,0.15)' : '#f3f4f6'}` }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                    {plan.key === 'starter'  && '🌱'}
                    {plan.key === 'business' && '🏢'}
                    {plan.key === 'pro'      && '🚀'}
                    {plan.key === 'lifetime' && '⭐'}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: plan.popular ? '#fff' : '#111827', margin: '0 0 0.35rem' }}>
                    {plan.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: plan.popular ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>$</span>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: plan.popular ? '#fff' : plan.color, lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: plan.popular ? 'rgba(255,255,255,0.5)' : '#9ca3af', fontWeight: 400 }}>
                      {plan.oneTime ? ' one-time' : '/month'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: plan.popular ? 'rgba(255,255,255,0.65)' : '#6b7280', margin: 0, lineHeight: 1.55 }}>
                    {plan.desc}
                  </p>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', margin: '0 0 1.75rem', padding: 0, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.65rem', fontSize: '0.875rem', color: plan.popular ? 'rgba(255,255,255,0.85)' : '#374151' }}>
                      <span style={{ color: plan.popular ? '#34d399' : plan.color, fontSize: '0.8rem', marginTop: '0.15rem', flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleGetStarted(plan.key)}
                  style={{
                    width: '100%', padding: '0.85rem', borderRadius: 10, fontWeight: 700,
                    fontSize: '0.95rem', cursor: 'pointer', transition: 'opacity 0.15s',
                    background: plan.popular ? '#4f46e5' : plan.color,
                    color: '#fff', border: 'none',
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  {plan.oneTime ? 'Buy Lifetime Access' : `Get ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Payment methods note */}
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', marginTop: '1.5rem' }}>
            Pay with <strong>Stripe</strong> (Visa · Mastercard · Amex) or <strong>Paynow</strong> (EcoCash · OneMoney · InnBucks · ZIPIT)
          </p>
        </section>

        {/* ── Feature comparison strip ── */}
        <section style={{ background: '#fff', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', padding: '3rem 1rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '2rem' }}>
              Everything you need to sell in retail
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                { icon: '📊', title: 'GS1-Compliant EAN-13', desc: 'Mathematically verified check digit. Scan anywhere in the world.' },
                { icon: '🖨️', title: '38mm / 300 DPI Export', desc: 'GS1 specification for retail packaging. Print-ready every time.' },
                { icon: '📦', title: 'Product Variations', desc: 'Colour, size, weight — one product, unlimited SKU variations.' },
                { icon: '🔑', title: 'API Access', desc: 'Generate barcodes programmatically from your own systems.' },
                { icon: '🌍', title: 'Multi-country Standards', desc: 'Switch between regional barcode standards with one click.' },
                { icon: '🔒', title: 'Private & Secure', desc: 'Your product data is account-private and never shared.' },
              ].map(f => (
                <div key={f.title} style={{ padding: '1.25rem', borderRadius: 12, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{f.title}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Enterprise ── */}
        <section style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0f0f1a 100%)', padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#a5b4fc', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Enterprise
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#fff', margin: '0 0 1rem', lineHeight: 1.25 }}>
              Built for organisations that operate at scale
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              When compliance, volume, and reliability are non-negotiable, a fixed plan isn't enough.
              We scope every Enterprise engagement around your infrastructure and catalogue size.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              {['GDPR-ready', 'SOC 2 aligned', 'SLA included', 'Multi-country', 'Dedicated support'].map(tag => (
                <span key={tag} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', borderRadius: 999, padding: '0.3rem 0.85rem', fontSize: '0.8rem' }}>
                  {tag}
                </span>
              ))}
            </div>
            <a
              href="mailto:enterprise@scancodezw.co.zw"
              style={{ display: 'inline-block', background: '#4f46e5', color: '#fff', borderRadius: 10, padding: '0.9rem 2rem', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
            >
              Talk to Enterprise Sales
            </a>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '2.5rem' }}>
            Frequently asked questions
          </h2>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '0 1.75rem' }}>
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </section>

      </main>
    </Layout>
  );
}
