import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function PaymentCancel() {
  return (
    <Layout>
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#9ca3af' }}>
            <i className="fas fa-ban"></i>
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Payment cancelled</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            No charge was made to your account. You can choose a plan and try again whenever you're ready.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/pricing" className="btn btn-primary">Back to Pricing</Link>
            <Link to="/dashboard" className="btn btn-outline">Go to Dashboard</Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
