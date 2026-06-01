import { useState, useMemo } from 'react';
import {
  PLAN_PRICES,
  createStripeCheckoutSession,
  initiatePaynowRedirect,
  initiatePaynowMobile,
  generateReference,
} from '../services/paymentService';
import Alert from './Alert';

// ── USSD sub-methods (inside the Paynow gateway) ─────────────────────────────
const USSD = {
  ecocash:  { label: 'EcoCash',  hint: 'Econet number',  network: 'Econet'  },
  onemoney: { label: 'OneMoney', hint: 'NetOne number',  network: 'NetOne'  },
};

// ── Step: enter phone for USSD ────────────────────────────────────────────────
function UssdPhoneStep({ method, planInfo, onSubmit, onBack, loading, error, onClearError }) {
  const [phone, setPhone] = useState('');
  const meta   = USSD[method];
  const digits = phone.replace(/\D/g, '');

  return (
    <div className="pm-ecocash-step">
      <button className="pm-back-btn" type="button" onClick={onBack}>← Back</button>

      <div className="pm-ecocash-header">
        <div>
          <p className="pm-ecocash-title">Pay with {meta.label}</p>
          <p className="pm-ecocash-amount">${planInfo?.usd}{planInfo?.oneTime ? ' one-time' : '/month'} · {planInfo?.label} plan</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={onClearError} />}

      <div className="pm-ecocash-field">
        <label htmlFor="ussd-phone">Your {meta.hint}</label>
        <div className="pm-ecocash-input-wrap">
          <span className="pm-ecocash-prefix">+263</span>
          <input
            id="ussd-phone"
            type="tel"
            placeholder="77 123 4567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={12}
            autoFocus
          />
        </div>
        <p className="pm-ecocash-hint">
          A USSD prompt will be sent to your {meta.network} number. Approve with your {meta.label} PIN.
        </p>
      </div>

      <button
        className="btn btn-primary btn-block"
        type="button"
        disabled={digits.length < 9 || loading}
        onClick={() => onSubmit(phone)}
      >
        {loading ? 'Sending USSD request…' : `Send ${meta.label} Request`}
      </button>
    </div>
  );
}

// ── Step: USSD sent — waiting on phone ───────────────────────────────────────
function UssdPendingStep({ method, msisdn, instructions, planInfo, onClose }) {
  const meta = USSD[method] ?? { label: method, network: method };
  return (
    <div className="pm-ecocash-step pm-ecocash-pending">
      <div className="pm-pending-icon">
        <svg viewBox="0 0 24 24" fill="none" width="44" height="44">
          <circle cx="12" cy="12" r="10.5" stroke="#22c55e" strokeWidth="1.5"/>
          <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="pm-pending-title">USSD Request Sent!</h3>
      <p className="pm-pending-sub">Prompt sent to <strong>{msisdn}</strong></p>
      {instructions && <div className="pm-pending-instructions">{instructions}</div>}
      <ol className="pm-pending-steps">
        <li><span className="pm-step-num">1</span><span>Check phone for a USSD prompt from <strong>{meta.label}</strong></span></li>
        <li><span className="pm-step-num">2</span><span>Confirm amount: <strong>${planInfo?.usd} USD{planInfo?.oneTime ? ' (one-time)' : ''}</strong></span></li>
        <li><span className="pm-step-num">3</span><span>Enter your <strong>{meta.label} PIN</strong> to approve</span></li>
        <li><span className="pm-step-num">4</span><span>Your account activates automatically</span></li>
      </ol>
      <div className="pm-pending-note">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0, marginTop:2 }}>
          <circle cx="7" cy="7" r="6.5" stroke="#9ca3af"/>
          <path d="M7 6v4M7 4.5v.01" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>No prompt after 60s? Check your {meta.network} line is active and has balance, then try again.</span>
      </div>
      <button className="btn btn-primary btn-block" type="button" style={{ marginTop:'1.25rem' }} onClick={onClose}>
        Done — I've approved the payment
      </button>
    </div>
  );
}

// ── Step: Paynow sub-method picker ────────────────────────────────────────────
function PaynowMethodStep({ onSelect, onBack }) {
  const opts = [
    { id: 'ecocash',  label: 'EcoCash',      desc: 'Econet USSD push to your phone'  },
    { id: 'onemoney', label: 'OneMoney',     desc: 'NetOne USSD push to your phone'   },
    { id: 'redirect', label: 'Card / Other', desc: 'Paynow hosted checkout — Visa, Mastercard, ZIPIT, InnBucks' },
  ];
  return (
    <div className="pm-ecocash-step">
      <button className="pm-back-btn" type="button" onClick={onBack}>← Back</button>
      <p style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 600, marginBottom: '0.875rem' }}>
        Choose Paynow payment type
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {opts.map(o => (
          <button
            key={o.id}
            type="button"
            className="pm-sub-option"
            onClick={() => onSelect(o.id)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{o.label}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{o.desc}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PaymentModal({ plan, user, onClose }) {
  const [gateway,      setGateway]      = useState(null);    // 'stripe' | 'paynow'
  const [step,         setStep]         = useState('select'); // 'select' | 'paynow-method' | 'ussd-phone' | 'ussd-pending' | 'waiting'
  const [ussdMethod,   setUssdMethod]   = useState(null);
  const [ussdMsisdn,   setUssdMsisdn]   = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const token     = user?.accessToken;
  const userId    = user?.id ?? user?.user_id;
  const reference = useMemo(() => generateReference(userId), [userId]);
  const planInfo  = PLAN_PRICES[plan];

  // ── Proceed button (gateway selection step) ────────────────────────────────
  const handleProceed = async () => {
    if (!gateway || loading) return;

    // Stripe: open checkout tab immediately
    if (gateway === 'stripe') {
      const checkoutWindow = window.open('about:blank', '_blank');
      if (!checkoutWindow) {
        setError('Pop-up blocked. Please allow pop-ups for this site and try again.');
        return;
      }
      setLoading(true); setError('');
      try {
        const data = await createStripeCheckoutSession({ plan, reference, token });
        checkoutWindow.location.href = data.url;
        setStep('waiting');
      } catch (err) {
        checkoutWindow.close();
        setError(err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Paynow: show method picker first
    if (gateway === 'paynow') {
      setStep('paynow-method');
    }
  };

  // ── Paynow sub-method selected ─────────────────────────────────────────────
  const handlePaynowMethod = async (method) => {
    if (method === 'redirect') {
      const checkoutWindow = window.open('about:blank', '_blank');
      if (!checkoutWindow) {
        setError('Pop-up blocked. Please allow pop-ups for this site and try again.');
        return;
      }
      setLoading(true); setError('');
      try {
        const data = await initiatePaynowRedirect({ plan, reference, token });
        checkoutWindow.location.href = data.redirectUrl;
        setStep('waiting');
      } catch (err) {
        checkoutWindow.close();
        setError(err.message || 'Failed to initiate payment.');
      } finally {
        setLoading(false);
      }
      return;
    }
    setUssdMethod(method);
    setStep('ussd-phone');
  };

  // ── USSD submit ─────────────────────────────────────────────────────────────
  const handleUssdSubmit = async (phone) => {
    setLoading(true); setError('');
    try {
      const res = await initiatePaynowMobile({ plan, phone, method: ussdMethod, token });
      setUssdMsisdn(phone);
      setInstructions(res.instructions ?? '');
      setStep('ussd-pending');
    } catch (err) {
      setError(err.message || 'Failed to send USSD request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content payment-modal-content">

        <div className="modal-header payment-modal-header">
          <div>
            <h2>Complete your subscription</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
              {planInfo?.label} plan — <strong>${planInfo?.usd}{plan === 'lifetime' ? ' one-time' : '/month'}</strong>
            </p>
          </div>
          <button className="close-modal" type="button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body pm-body">

          {/* ── Waiting for payment (after new-tab redirect) ── */}
          {step === 'waiting' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#4f46e5' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Payment in progress</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                A secure checkout page was opened in a new tab. Complete your payment there.
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Reference: <code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{reference}</code>
              </p>
              <button className="btn btn-outline btn-block" type="button" onClick={onClose}>
                Close &amp; Go to Dashboard
              </button>
            </div>
          )}

          {/* ── Gateway selection ── */}
          {step === 'select' && (
            <>
              {error && <Alert type="error" message={error} onClose={() => setError('')} />}

              <p className="pm-label">PAYMENT METHOD</p>

              <div className="pm-gateway-list">

                {/* Stripe */}
                <button
                  type="button"
                  className={`pm-gateway-btn${gateway === 'stripe' ? ' pm-gateway-selected' : ''}`}
                  onClick={() => setGateway('stripe')}
                >
                  <div className="pm-gateway-logo-wrap">
                    <img
                      src="/stripe-banner.png"
                      alt="Stripe — Visa, Mastercard, Maestro, Amex"
                      className="pm-gateway-img"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                    <div className="pm-gateway-fallback" style={{ display: 'none' }}>
                      <span style={{ color: '#635bff', fontWeight: 700, fontSize: '1.4rem', fontFamily: 'system-ui' }}>stripe</span>
                    </div>
                  </div>
                  <div className={`pm-gateway-radio${gateway === 'stripe' ? ' on' : ''}`}>
                    {gateway === 'stripe' && <div className="pm-gateway-dot" />}
                  </div>
                </button>

                {/* Paynow */}
                <button
                  type="button"
                  className={`pm-gateway-btn${gateway === 'paynow' ? ' pm-gateway-selected' : ''}`}
                  onClick={() => setGateway('paynow')}
                >
                  <div className="pm-gateway-logo-wrap">
                    <img
                      src="/paynow-banner.png"
                      alt="Paynow — Visa, Mastercard, ZimSwitch, EcoCash, OneMoney, Telecash"
                      className="pm-gateway-img"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                    <div className="pm-gateway-fallback" style={{ display: 'none' }}>
                      <span style={{ color: '#00b4d8', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'system-ui' }}>paynow</span>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>secure online payments</span>
                    </div>
                  </div>
                  <div className={`pm-gateway-radio${gateway === 'paynow' ? ' on' : ''}`}>
                    {gateway === 'paynow' && <div className="pm-gateway-dot" />}
                  </div>
                </button>

              </div>

              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={handleProceed}
                disabled={!gateway || loading}
                style={{ marginTop: '1.5rem' }}
              >
                {loading ? 'Redirecting…' : gateway ? 'Proceed to Payment' : 'Select a payment method'}
              </button>

              <p className="pm-secure">
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ display:'inline', verticalAlign:'middle', marginRight:5 }}>
                  <path d="M5.5 0L0 2.3v3.7C0 8.9 2.36 11.93 5.5 13 8.64 11.93 11 8.9 11 6V2.3L5.5 0z" fill="#9ca3af"/>
                </svg>
                Payments are encrypted and processed securely.
              </p>
            </>
          )}

          {/* ── Paynow sub-method ── */}
          {step === 'paynow-method' && (
            <PaynowMethodStep
              onSelect={handlePaynowMethod}
              onBack={() => { setStep('select'); setError(''); }}
            />
          )}

          {/* ── USSD phone entry ── */}
          {step === 'ussd-phone' && (
            <UssdPhoneStep
              method={ussdMethod}
              planInfo={planInfo}
              onSubmit={handleUssdSubmit}
              onBack={() => setStep('paynow-method')}
              loading={loading}
              error={error}
              onClearError={() => setError('')}
            />
          )}

          {/* ── USSD pending ── */}
          {step === 'ussd-pending' && (
            <UssdPendingStep
              method={ussdMethod}
              msisdn={ussdMsisdn}
              instructions={instructions}
              planInfo={planInfo}
              onClose={onClose}
            />
          )}

        </div>
      </div>
    </div>
  );
}
