import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm_password: '', terms: false });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password !== form.confirm_password)         { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)                        { setError('Password must be at least 6 characters.'); return; }
    if (!form.terms)                                     { setError('Please accept the Terms of Service.'); return; }
    setLoading(true);
    try {
      const result = await register(form.username, form.email, form.password);
      if (result.success) navigate('/login');
      else setError(result.error);
    } finally {
      setLoading(false);
    }
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
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <div className="input-with-icon">
                  <i className="fas fa-user"></i>
                  <input type="text" id="username" name="username" required placeholder="Enter your username" value={form.username} onChange={handle} />
                </div>
                <p className="form-hint">Cannot be "admin" — reserved for system administration</p>
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
                <i className="fas fa-user-plus"></i> {loading ? 'Creating account…' : 'Create Account'}
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
            <div className="plan-preview">
              <h4>Free Basic Plan includes:</h4>
              <ul>
                <li><i className="fas fa-box"></i> 5 products maximum</li>
                <li><i className="fas fa-barcode"></i> 5 variations per product</li>
                <li><i className="fas fa-globe"></i> Zimbabwe EAN-13 standard</li>
                <li><i className="fas fa-download"></i> PNG &amp; PDF downloads</li>
                <li><i className="fas fa-qrcode"></i> QR code generation</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
