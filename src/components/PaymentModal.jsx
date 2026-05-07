import { useState } from 'react';
import {
  PLAN_PRICES,
  createStripeCheckoutSession,
  initiatePaynowRedirect,
  generateReference,
} from '../services/paymentService';
import Alert from './Alert';

const ZW_METHODS = [
  { id: 'ecocash',  label: 'EcoCash',  icon: 'fas fa-mobile-alt', color: '#e31e24' },
  { id: 'onemoney', label: 'OneMoney', icon: 'fas fa-mobile-alt', color: '#f59e0b' },
  { id: 'innbucks', label: 'InnBucks', icon: 'fas fa-mobile-alt', color: '#10b981' },
  { id: 'zipit',    label: 'ZIPIT',    icon: 'fas fa-university', color: '#3b82f6' },
  { id: 'omari',    label: 'Omari',    icon: 'fas fa-wallet',     color: '#6366f1' },
];

export default function PaymentModal({ plan, user, onClose }) {
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const userId    = user?.id ?? user?.user_id;
  const reference = generateReference(userId);
  const planInfo  = PLAN_PRICES[plan];

  const handleProceed = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError('');
    try {
      if (selected === 'card') {
        const { url } = await createStripeCheckoutSession({
          plan, userId, email: user.email, reference,
        });
        window.location.href = url;
      } else {
        const { redirectUrl } = await initiatePaynowRedirect({
          plan, userId, email: user.email, reference,
        });
        window.location.href = redirectUrl;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const selectedMethod = ZW_METHODS.find(m => m.id === selected);

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content payment-modal-content">

        <div className="modal-header payment-modal-header">
          <div>
            <h2><i className="fas fa-lock"></i> Complete your subscription</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              {planInfo?.label} plan — <strong>${planInfo?.usd}/month</strong>
            </p>
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem 2rem' }}>
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {/* Card (Stripe) */}
          <div className="pm-section-label">Pay with card</div>
          <button
            className={`pm-card-btn${selected === 'card' ? ' pm-selected' : ''}`}
            onClick={() => setSelected('card')}
          >
            <span className="pm-card-icons">
              <i className="fab fa-cc-visa"></i>
              <i className="fab fa-cc-mastercard"></i>
              <i className="fab fa-cc-amex"></i>
            </span>
            <span className="pm-card-label">Visa / Mastercard / Amex</span>
            <span className="pm-powered">via Stripe Checkout</span>
          </button>

          {/* Divider */}
          <div className="pm-divider"><span>or pay with mobile money</span></div>

          {/* ZW mobile money methods */}
          <div className="pm-method-grid">
            {ZW_METHODS.map(m => (
              <button
                key={m.id}
                type="button"
                className={`pm-method-btn${selected === m.id ? ' pm-selected' : ''}`}
                style={selected === m.id ? { borderColor: m.color, background: `${m.color}15` } : {}}
                onClick={() => setSelected(m.id)}
              >
                <i className={m.icon} style={{ color: m.color }}></i>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Proceed */}
          <button
            className="btn btn-primary btn-block btn-pay"
            onClick={handleProceed}
            disabled={!selected || loading}
            style={{ marginTop: '1.25rem' }}
          >
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Redirecting to checkout…</>
              : selected
                ? <><i className="fas fa-arrow-right"></i> Proceed to Payment — ${planInfo?.usd}</>
                : 'Select a payment method above'
            }
          </button>

          <p className="pm-security-note">
            <i className="fas fa-shield-alt"></i>
            {selected === 'card'
              ? "You'll be redirected to Stripe's secure, PCI-compliant checkout page."
              : selected
                ? `You'll be redirected to Paynow's secure checkout to complete your ${selectedMethod?.label} payment.`
                : 'Your payment is processed on a secure, hosted checkout page.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
