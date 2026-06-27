import { useState } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  createStripeCheckoutSession,
  initiatePaynowRedirect,
  generateReference,
  PLAN_PRICES,
} from '../services/paymentService';

const GATEWAY_OPTIONS = [
  {
    key:  'paynow',
    name: 'Paynow',
    sub:  'EcoCash · OneMoney · InnBucks · ZIPIT',
  },
  {
    key:  'stripe',
    name: 'Stripe',
    sub:  'Visa · Mastercard · American Express',
  },
];

export default function CheckoutPage() {
  const { user }           = useAuth();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const planKey            = (searchParams.get('plan') ?? 'starter').toLowerCase();
  const planInfo           = PLAN_PRICES[planKey];

  const [gateway,         setGateway]         = useState('paynow');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [awaitingPayment, setAwaitingPayment] = useState(null); // { reference }

  // Not logged in — send to register with plan pre-selected
  if (!user) return <Navigate to={`/register?plan=${planKey}`} replace />;

  // Invalid or free plan — back to pricing
  if (!planInfo || planInfo.usd === 0) return <Navigate to="/pricing" replace />;

  const priceLabel = `$${planInfo.usd.toFixed(2)}`;
  const isOneTime  = !!planInfo.oneTime;

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const reference = generateReference(user.id);
      const token     = user.accessToken;
      let   checkoutUrl;

      if (gateway === 'stripe') {
        const data = await createStripeCheckoutSession({ plan: planKey, reference, token });
        checkoutUrl = data.url;
      } else {
        const data = await initiatePaynowRedirect({ plan: planKey, reference, token });
        checkoutUrl = data.redirectUrl;
      }

      // Try to open checkout in a new tab; fall back to same-tab redirect if popup is blocked
      const newTab = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Popup blocked — redirect in the same tab (normal SPA navigation)
        window.location.href = checkoutUrl;
      } else {
        // New tab opened — show a waiting state on this page
        setAwaitingPayment({ reference });
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  // ── Waiting state: checkout opened in new tab ─────────────────────────────
  if (awaitingPayment) {
    const returnUrl = `/payment/return?reference=${encodeURIComponent(awaitingPayment.reference)}`;
    return (
      <Layout>
        <main style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: '#f9fafb' }}>
          <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem', color: '#0ea5e9' }}>
              <i className="fas fa-external-link-alt" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
              Checkout opened in a new tab
            </h1>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              Complete your payment on the {gateway === 'stripe' ? 'Stripe' : 'Paynow'} page that just opened.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Once payment is confirmed you'll be redirected to your dashboard automatically.
              You can also click the button below to check your payment status.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', borderRadius: 10, fontWeight: 700, fontSize: '1rem', border: 'none', background: '#111827', color: '#fff', cursor: 'pointer' }}
                onClick={() => navigate(returnUrl)}
              >
                Check Payment Status
              </button>
              <button
                style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '0.75rem', color: '#374151', cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
              If the new tab did not open,{' '}
              <button
                style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}
                onClick={() => { setAwaitingPayment(null); setLoading(false); }}
              >
                go back and try again
              </button>
              .
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  // ── Normal checkout form ──────────────────────────────────────────────────
  return (
    <Layout>
      <main style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: '#f9fafb' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              Complete Your Purchase
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Select a payment gateway — you'll be redirected to their secure checkout
            </p>
          </div>

          {/* Order summary */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '1rem' }}>
              ORDER SUMMARY
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>{planInfo.label} Plan</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {isOneTime ? 'One-time payment' : 'Monthly subscription'}
                </div>
              </div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{priceLabel}</div>
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#111827' }}>Total due today</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{priceLabel}</div>
            </div>
          </div>

          {/* Gateway selection */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '1rem' }}>
              PAYMENT GATEWAY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {GATEWAY_OPTIONS.map(g => {
                const active = gateway === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGateway(g.key)}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      padding:        '1rem 1.25rem',
                      borderRadius:   10,
                      border:         active ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
                      background:     '#fff',
                      cursor:         'pointer',
                      textAlign:      'left',
                      transition:     'border-color 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>{g.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{g.sub}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20,
                      borderRadius: '50%',
                      border:  active ? '2px solid #0ea5e9' : '2px solid #d1d5db',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0ea5e9' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            style={{
              display:      'block',
              width:        '100%',
              padding:      '1rem',
              borderRadius: 10,
              border:       'none',
              background:   loading ? '#374151' : '#111827',
              color:        '#fff',
              fontWeight:   700,
              fontSize:     '1rem',
              cursor:       loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem',
              transition:   'background 0.15s',
            }}
          >
            {loading
              ? 'Opening checkout…'
              : `Continue to ${gateway === 'stripe' ? 'Stripe' : 'Paynow'} Checkout — ${priceLabel}`}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link to="/pricing" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
              ← Back to Plans
            </Link>
          </div>

        </div>
      </main>
    </Layout>
  );
}
