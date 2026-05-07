import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Client Login</h2>
            <p className="auth-subtitle">Enter your credentials to access your barcode dashboard</p>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={handle}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handle}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Don't have an account? <Link to="/register">Register here</Link></p>
              <p className="admin-note">
                <small>
                  <i className="fas fa-user-shield"></i> Admin?{' '}
                  <Link to="/admin">Go to Admin Login</Link>
                </small>
              </p>
            </div>
          </div>

          <div className="auth-info">
            <h3>Why ScanCodeZW?</h3>
            <ul>
              <li><i className="fas fa-check"></i> Generate professional EAN-13 barcodes</li>
              <li><i className="fas fa-check"></i> Manage all product variations</li>
              <li><i className="fas fa-check"></i> Download PNG &amp; PDF formats</li>
              <li><i className="fas fa-check"></i> Generate QR codes instantly</li>
              <li><i className="fas fa-check"></i> Country-specific barcode standards</li>
              <li><i className="fas fa-check"></i> Access from any device, anytime</li>
            </ul>
          </div>
        </div>
      </main>
    </Layout>
  );
}
