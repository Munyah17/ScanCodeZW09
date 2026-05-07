import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const MAX_POLL_ATTEMPTS = 15;  // 15 × 2s = 30 seconds
const POLL_INTERVAL_MS  = 2000;

export default function PaymentReturn() {
  const [params]  = useSearchParams();
  const reference = params.get('reference');

  const [status,  setStatus]  = useState('checking'); // checking | paid | pending | failed | unknown
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reference) { setStatus('unknown'); return; }
    checkPayment(0);
  }, [reference]);

  async function checkPayment(n) {
    try {
      const { data, error } = supabase
        ? await supabase.from('payments').select('status, plan').eq('reference', reference).single()
        : { data: null, error: null };

      if (error && error.code !== 'PGRST116') {
        console.error('[PaymentReturn]', error.message);
      }

      if (data?.status === 'paid') {
        setStatus('paid');
        return;
      }

      if (data?.status === 'failed' || data?.status === 'cancelled') {
        setStatus('failed');
        return;
      }

      // Not yet confirmed — keep polling
      if (n < MAX_POLL_ATTEMPTS) {
        setAttempt(n + 1);
        setTimeout(() => checkPayment(n + 1), POLL_INTERVAL_MS);
      } else {
        // Webhook may have been delayed; show a softer "pending" state
        setStatus('pending');
      }
    } catch (err) {
      console.error('[PaymentReturn] fetch error:', err);
      if (n < MAX_POLL_ATTEMPTS) {
        setTimeout(() => checkPayment(n + 1), POLL_INTERVAL_MS);
      } else {
        setStatus('pending');
      }
    }
  }

  return (
    <Layout>
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          {status === 'checking' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#4f46e5' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Confirming your payment…</h2>
              <p style={{ color: '#6b7280' }}>
                Please wait while we verify your payment with the provider.
                {attempt > 0 && ` (${attempt}/${MAX_POLL_ATTEMPTS})`}
              </p>
            </>
          )}

          {status === 'paid' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#10b981' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <h2 style={{ marginBottom: '0.5rem', color: '#10b981' }}>Payment Confirmed!</h2>
              <p style={{ color: '#374151', marginBottom: '2rem' }}>
                Your subscription is now active. You can start using all the features of your plan right away.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                <Link to="/generate-barcode" className="btn btn-outline">Generate Barcodes</Link>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
                <i className="fas fa-clock"></i>
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Payment received — activating…</h2>
              <p style={{ color: '#374151', marginBottom: '1rem' }}>
                Your payment was received but activation is still in progress. This usually takes less than a minute.
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Reference: <code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{reference}</code>
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                <Link to="/pricing" className="btn btn-outline">Back to Pricing</Link>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                <i className="fas fa-times-circle"></i>
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Payment not completed</h2>
              <p style={{ color: '#374151', marginBottom: '2rem' }}>
                Your payment could not be processed. No charge was made to your account. Please try again or choose a different payment method.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/pricing" className="btn btn-primary">Try Again</Link>
                <Link to="/dashboard" className="btn btn-outline">Go to Dashboard</Link>
              </div>
            </>
          )}

          {status === 'unknown' && (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#9ca3af' }}>
                <i className="fas fa-question-circle"></i>
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>No payment reference found</h2>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                This page is shown after completing a payment. If you arrived here by mistake, head back to pricing.
              </p>
              <Link to="/pricing" className="btn btn-primary">View Pricing</Link>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
