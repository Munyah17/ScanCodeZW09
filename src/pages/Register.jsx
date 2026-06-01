import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import PaymentModal from '../components/PaymentModal';

const PLANS = [
  {
    key: 'free',
    name: 'Free Trial',
    price: '$0',
    suffix: '',
    color: '#6b7280',
    features: ['1 barcode/month', '1 QR code/month', 'EAN-13 & UPC-A', 'PNG download'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$4.79',
    suffix: '/mo',
    color: '#10b981',
    features: ['3 products', '3 variations/product', 'EAN-13 & UPC-A', 'PNG & PDF downloads'],
  },
  {
    key: 'business',
    name: 'Business',
    price: '$11.99',
    suffix: '/mo',
    color: '#4f46e5',
    popular: true,
    features: ['20 products', '15 variations/product', 'All formats', 'Custom branding'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$24.99',
    suffix: '/mo',
    color: '#8b5cf6',
    features: ['100 products', '50 variations/product', 'API access', 'Advanced analytics'],
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: '$129.99',
    suffix: ' one-time',
    color: '#f59e0b',
    features: ['Unlimited everything', 'No renewals', 'Priority support', 'Full API access'],
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm_password: '', terms: false, plan: 'free' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // After account creation for a paid plan, hold user data to pass to PaymentModal
  const [paymentUser, setPaymentUser] = useState(null);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password !== form.confirm_password)          { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)                         { setError('Password must be at least 6 characters.'); return; }
    if (!form.terms)                                      { setError('Please accept the Terms of Service.'); return; }

    setLoading(true);
    try {
      const result = await register(form.username, form.email, form.password);
      if (!result.success) {
        setError(result.error);
        return;
      }

      if (form.plan === 'free') {
        // Free plan — go straight to dashboard
        navigate('/dashboard');
      } else {
        // Paid plan — show payment modal immediately; account is already created & signed in
        setPaymentUser({ id: result.userId, email: result.email, accessToken: result.accessToken });
      }
    } finally {
      setLoading(false);
    }
  };

  // Called when user closes the payment modal without paying (or after payment redirect)
  const handlePaymentClose = () => {
    navigate('/dashboard');
  };

  return (
    <Layout>
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Create Account</h2>
            <p className="auth-subtitle">Register to start generating barcodes for your products</p>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <form onSubmit={handleSubmit} className="auth-form">

              {/* Plan selection */}
              <div className="form-group">
                <label>Choose a Plan *</label>
                <div className="reg-plan-list">
                  {PLANS.map(p => {
                    const active = form.plan === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className={`reg-plan-row${active ? ' selected' : ''}`}
                        style={{ '--plan-color': p.color }}
                        onClick={() => setForm(f => ({ ...f, plan: p.key }))}
                      >
                        <div className={`reg-plan-radio${active ? ' on' : ''}`}>
                          {active && <div className="reg-plan-radio-dot" />}
                        </div>
                        <div className="reg-plan-details">
                          <div className="reg-plan-top">
                            <span className="reg-plan-name">{p.name}</span>
                            {p.popular && <span className="reg-plan-badge">Most Popular</span>}
                          </div>
                          <span className="reg-plan-sub">{p.features.slice(0, 2).join(' · ')}</span>
                        </div>
                        <div className="reg-plan-price">
                          {p.price}<span>{p.suffix}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <div className="input-with-icon">
                  <i className="fas fa-user"></i>
                  <input type="text" id="username" name="username" required placeholder="Enter your username" value={form.username} onChange={handle} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input type="email" id="email" name="email" required placeholder="Enter your email" value={form.email} onChange={handle} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input type="password" id="password" name="password" required placeholder="Minimum 6 characters" value={form.password} onChange={handle} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password *</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input type="password" id="confirm_password" name="confirm_password" required placeholder="Confirm your password" value={form.confirm_password} onChange={handle} />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="terms" checked={form.terms} onChange={handle} />
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                <i className="fas fa-user-plus"></i>{' '}
                {loading
                  ? 'Creating account…'
                  : form.plan === 'free'
                    ? 'Create Account'
                    : 'Create Account & Continue to Payment'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Login here</Link></p>
            </div>
          </div>

          <div className="auth-info">
            <h3>Why Register?</h3>
            <ul>
              <li><i className="fas fa-check"></i> Generate professional EAN-13 barcodes</li>
              <li><i className="fas fa-check"></i> Manage unlimited product variations</li>
              <li><i className="fas fa-check"></i> Download barcodes in PNG &amp; PDF formats</li>
              <li><i className="fas fa-check"></i> Generate QR codes for each product</li>
              <li><i className="fas fa-check"></i> Country-specific barcode standards</li>
              <li><i className="fas fa-check"></i> Access from any device, anytime</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Payment modal — shown immediately after account creation for paid plans */}
      {paymentUser && (
        <PaymentModal
          plan={form.plan}
          user={paymentUser}
          onClose={handlePaymentClose}
        />
      )}
    </Layout>
  );
}
