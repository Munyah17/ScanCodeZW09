import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function PaymentCancel() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const plan         = params.get('plan');
  const retryUrl     = plan ? `/checkout?plan=${plan}` : '/pricing';

  return (
    <Layout>
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#9ca3af' }}>
            <i className="fas fa-ban"></i>
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Payment cancelled</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            No charge was made to your account. You can try again or choose a different payment method whenever you're ready.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate(retryUrl)}>
              Try Again
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    </Layout>
  );
}
