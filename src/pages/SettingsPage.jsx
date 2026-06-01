import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashLayout from '../components/DashLayout';
import PaymentModal from '../components/PaymentModal';

const REGULAR_PLANS = [
  { key: 'starter',  label: 'Starter',  price: '4.79',  features: ['3 products', '3 variations/product', 'EAN-13 & UPC-A', 'QR codes', 'PNG & PDF'] },
  { key: 'business', label: 'Business', price: '11.99',  features: ['20 products', '15 variations/product', 'All formats', 'Custom branding', 'Priority support'] },
  { key: 'pro',      label: 'Pro',      price: '24.99', features: ['100 products', '50 variations/product', 'All formats', '24/7 support', 'API access'] },
];

const PREMIUM_PLANS = [
  { key: 'lifetime', label: 'Lifetime', price: '129.99', features: ['Unlimited products', 'Unlimited variations', 'All formats forever', 'Priority support', 'No renewals'], oneTime: true },
  { key: 'enterprise', label: 'Enterprise', price: 'Custom', features: ['Unlimited everything', 'White-label exports', 'Full API access', 'SLA guarantee', 'Dedicated manager'], custom: true },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const [msg,           setMsg]           = useState('');
  const [err,           setErr]           = useState('');
  const [checkoutPlan,  setCheckoutPlan]  = useState(null);

  const currentPlan = user?.subscription_type ?? 'free';

  const isSuperAdmin = user?.isSuperAdmin;

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (isSuperAdmin) { setErr('The Super Admin account cannot be deleted.'); return; }
    if (deleteConfirm !== user?.username) { setErr('Username does not match.'); return; }
    setDeleting(true);
    if (supabase) {
      await supabase.from('variations').delete().eq('user_id', user.id);
      await supabase.from('products').delete().eq('user_id', user.id);
    }
    await logout();
    navigate('/');
  };

  return (
    <DashLayout active="settings" title="Settings">
      {msg && <div className="dp-alert dp-alert-success">{msg}</div>}
      {err && <div className="dp-alert dp-alert-error" onClick={() => setErr('')} style={{ cursor: 'pointer' }}>{err} ✕</div>}

      {/* Subscription */}
      <div className="dp-section">
        <div className="dp-section-header">
          <div>
            <p className="dp-section-title">Subscription</p>
            <p className="dp-section-sub">
              Current plan: <strong style={{ color: '#e5e7eb', textTransform: 'capitalize' }}>{currentPlan}</strong>
              {user?.subscription_end_date && (
                <> · Renews {new Date(user.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</>
              )}
            </p>
          </div>
        </div>

        {/* Regular plans row */}
        <div className="dp-plan-grid">
          {REGULAR_PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div key={plan.key} className={`dp-plan-card${isCurrent ? ' dp-plan-card-current' : ''}`}>
                {isCurrent && <span className="dp-plan-card-current-tag">CURRENT</span>}
                <div className="dp-plan-card-name">{plan.label}</div>
                <div className="dp-plan-card-price">${plan.price}<span>/mo</span></div>
                <ul className="dp-plan-feat">
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                {!isCurrent && (
                  <button
                    className="dp-btn dp-btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setCheckoutPlan(plan.key)}
                  >
                    {currentPlan === 'starter' || plan.key === 'pro' ? 'Upgrade' : 'Switch'} to {plan.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Premium plans row */}
        <div className="dp-plan-grid dp-plan-grid-premium">
          {PREMIUM_PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div key={plan.key} className={`dp-plan-card dp-plan-card-premium${isCurrent ? ' dp-plan-card-current' : ''}${plan.oneTime ? ' dp-plan-card-lifetime' : ''}${plan.custom ? ' dp-plan-card-enterprise' : ''}`}>
                {isCurrent && <span className="dp-plan-card-current-tag">CURRENT</span>}
                {plan.oneTime && <span className="dp-plan-card-premium-badge">BEST VALUE</span>}
                {plan.custom && <span className="dp-plan-card-premium-badge dp-plan-card-premium-badge-enterprise">CUSTOM</span>}
                <div className="dp-plan-card-name">{plan.label}</div>
                <div className="dp-plan-card-price dp-plan-card-price-premium">
                  {plan.price === 'Custom' ? plan.price : `$${plan.price}`}
                  <span>{plan.oneTime ? ' one-time' : plan.custom ? '' : '/mo'}</span>
                </div>
                <ul className="dp-plan-feat dp-plan-feat-premium">
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                {!isCurrent && (
                  plan.custom ? (
                    <Link
                      to="/pricing"
                      className="dp-btn dp-btn-primary dp-btn-premium"
                      style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      Contact Sales
                    </Link>
                  ) : (
                    <button
                      className="dp-btn dp-btn-primary dp-btn-premium"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setCheckoutPlan(plan.key)}
                    >
                      Upgrade to {plan.label}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#4b5563' }}>
          Plan changes take effect immediately after payment. For Enterprise, <Link to="/pricing" style={{ color: '#60a5fa' }}>contact sales</Link>.
        </p>
      </div>

      {/* Notifications */}
      <div className="dp-section">
        <div className="dp-section-header">
          <p className="dp-section-title">Notifications</p>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Email notifications are enabled for billing events and subscription changes.
        </p>
        {['Subscription renewal reminders', 'Payment confirmation emails', 'Account suspension / deletion warnings'].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.875rem', color: '#d1d5db' }}>
            <span style={{ color: '#34d399', fontSize: '0.8rem' }}>✓</span>
            {item}
          </div>
        ))}
      </div>

      {/* Danger zone — hidden for Super Admin */}
      {!isSuperAdmin && (
        <div className="dp-section dp-danger-section">
          <div className="dp-section-header">
            <p className="dp-section-title dp-danger-title">Danger Zone</p>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Permanently deletes your account, all products, and all barcode data. This cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount}>
            <div className="dp-form-row">
              <label className="dp-label">
                Type your username <strong style={{ color: '#e5e7eb' }}>{user?.username}</strong> to confirm
              </label>
              <input
                className="dp-input"
                placeholder="Enter your username"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="dp-btn dp-btn-danger"
              disabled={deleting || deleteConfirm !== user?.username}
            >
              {deleting ? 'Deleting…' : 'Delete My Account Permanently'}
            </button>
          </form>
        </div>
      )}

      {checkoutPlan && user && (
        <PaymentModal
          plan={checkoutPlan}
          user={user}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </DashLayout>
  );
}
