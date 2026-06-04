import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const PLANS = [
  {
    name: 'Starter',
    price: '4.79',
    popular: false,
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
    name: 'Business',
    price: '11.99',
    popular: true,
    color: '#4f46e5',
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
    name: 'Pro',
    price: '24.99',
    popular: false,
    color: '#8b5cf6',
    desc: 'For established businesses with large catalogues and export requirements.',
    features: [
      'Up to 100 products',
      '50 variations per product',
      'All barcode formats',
      'PNG & PDF downloads (38mm / 300 DPI)',
      'Custom branding on exports',
      '24/7 phone & email support',
      'API access (read-only)',
      'Advanced analytics dashboard',
      'Multi-country standard switching',
    ],
  },
  {
    name: 'Lifetime',
    price: '129.99',
    popular: false,
    oneTime: true,
    color: '#f59e0b',
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
  { q: 'Is my product data secure?', a: 'Yes. Your products and barcodes are stored in your account only and are not visible to other users. Admin access is on a completely separate login.' },
];

function EnterpriseContactForm() {
  const [form, setForm]       = useState({ name: '', company: '', email: '', message: '' });
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // TODO: POST form to your backend / Supabase / Resend / Mailgun
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div className="ent-contact-sent">
      <i className="fas fa-check-circle"></i>
      <strong>Message received!</strong>
      <span>We'll be in touch within one business day.</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="ent-contact-form">
      <div className="ent-form-row-2">
        <div className="form-group">
          <input name="name"    className="form-input" placeholder="Your name *"    value={form.name}    onChange={handle} required />
        </div>
        <div className="form-group">
          <input name="company" className="form-input" placeholder="Company name *" value={form.company} onChange={handle} required />
        </div>
      </div>
      <div className="form-group">
        <input name="email" type="email" className="form-input" placeholder="Work email *" value={form.email} onChange={handle} required />
      </div>
      <div className="form-group">
        <textarea name="message" className="form-input" rows={3}
          placeholder="Tell us about your product catalogue size, team, and any integration requirements…"
          value={form.message} onChange={handle} required style={{ resize: 'vertical' }}
        />
      </div>
      <button type="submit" className="btn ent-btn-primary btn-block" disabled={loading}>
        {loading ? <><i className="fas fa-spinner fa-spin"></i> Sending…</> : <><i className="fas fa-paper-plane"></i> Send Message</>}
      </button>
    </form>
  );
}

export default function Pricing() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const handleGetStarted = (planKey) => {
    if (user) {
      navigate(`/checkout?plan=${planKey}`);
    } else {
      navigate(`/register?plan=${planKey}`);
    }
  };

  return (
    <Layout>
      <main className="pricing-page">

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-content">
            <span className="page-hero-label"><i className="fas fa-tag"></i> Pricing</span>
            <h1>Simple, transparent pricing</h1>
            <p>No hidden fees. No long-term contracts. Pick the plan that fits your business and upgrade whenever you need more.</p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pricing-section" style={{ paddingTop: '3rem' }}>
          <div className="pricing-grid pricing-grid-4">
            {PLANS.map(plan => (
              <div key={plan.name} className={`pricing-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <div className="plan-icon" style={{ color: plan.color }}><i className="fas fa-box"></i></div>
                  <h3>{plan.name}</h3>
                  <div className="price" style={{ color: plan.color }}>
                    ${plan.price}<span>{plan.oneTime ? ' one-time' : '/month'}</span>
                  </div>
                  <p className="plan-desc">{plan.desc}</p>
                </div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}><i className="fas fa-check" style={{ color: plan.color }}></i> {f}</li>
                  ))}
                </ul>
                <button
                  className="btn btn-block"
                  style={plan.popular
                    ? { backgroundColor: plan.color, color: 'white', border: 'none' }
                    : { backgroundColor: 'transparent', border: `1px solid ${plan.color}`, color: plan.color }
                  }
                  onClick={() => handleGetStarted(plan.name.toLowerCase())}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Enterprise ── */}
        <section id="enterprise" className="enterprise-section">

          {/* Hero band */}
          <div className="ent-hero">
            <div className="ent-hero-label">
              <span className="ent-dot"></span> Enterprise
            </div>
            <h2 className="ent-hero-headline">
              Built for organisations<br />that operate at scale
            </h2>
            <p className="ent-hero-sub">
              When compliance, volume, and reliability are non-negotiable, a fixed plan
              isn't enough. We scope every Enterprise engagement around your infrastructure,
              catalogue size, and integration requirements — then price accordingly.
            </p>
            <div className="ent-hero-actions">
              <a href="mailto:enterprise@scancodezw.co.zw" className="btn ent-btn-primary">
                <i className="fas fa-paper-plane"></i> Talk to Enterprise Sales
              </a>
              <a href="#enterprise-contact" className="btn ent-btn-ghost">
                Schedule a call <i className="fas fa-arrow-right"></i>
              </a>
            </div>
            <div className="ent-hero-trust">
              <span><i className="fas fa-shield-alt"></i> GDPR-ready</span>
              <span><i className="fas fa-lock"></i> SOC 2 aligned</span>
              <span><i className="fas fa-file-contract"></i> SLA included</span>
              <span><i className="fas fa-globe"></i> Multi-country</span>
            </div>
          </div>

        </section>

      </main>

    </Layout>
  );
}
