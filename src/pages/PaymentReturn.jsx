import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const MAX_POLL_ATTEMPTS = 25;  // 25 × 2s = 50 seconds
const POLL_INTERVAL_MS  = 2000;
const INITIAL_DELAY_MS  = 1500; // give webhook time to fire before first check
const REDIRECT_DELAY_MS = 2000;

export default function PaymentReturn() {
  const [params]           = useSearchParams();
  const navigate           = useNavigate();
  const { refreshProfile } = useAuth();
  const reference          = params.get('reference');

  const [status,  setStatus]  = useState('checking');
  const [attempt, setAttempt] = useState(0);
  const redirected            = useRef(false);

  useEffect(() => {
    if (!reference) { setStatus('unknown'); return; }
    // Give the webhook a moment to land before the first DB read
    const t = setTimeout(() => checkPayment(0), INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [reference]);

  useEffect(() => {
    if (status === 'paid' && !redirected.current) {
      redirected.current = true;
      refreshProfile().then(() => {
        setTimeout(() => navigate('/dashboard', { replace: true }), REDIRECT_DELAY_MS);
      });
    }
  }, [status]);

  async function checkPayment(n) {
    try {
      const { data, error } = supabase
        ? await supabase
            .from('payments')
            .select('status, plan')
            .eq('reference', reference)
            .single()
        : { data: null, error: null };

      if (error && error.code !== 'PGRST116') {
        console.warn('[PaymentReturn]', error.message);
      }

      if (data?.status === 'paid') {
        setStatus('paid');
        return;
      }

      if (data?.status === 'failed' || data?.status === 'cancelled') {
        setStatus('failed');
        return;
      }

      if (n < MAX_POLL_ATTEMPTS) {
        setAttempt(n + 1);
        setTimeout(() => checkPayment(n + 1), POLL_INTERVAL_MS);
      } else {
        // Timed out — likely still processing (Paynow can be slow on mobile money)
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
                Waiting for confirmation from the payment gateway.
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
              <p style={{ color: '#374151', marginBottom: '1rem' }}>
                Your subscription is now active. Taking you to your dashboard…
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Redirecting…</span>
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
                Your payment was received but the plan activation is still processing.
                This usually completes within a minute. Your dashboard will reflect
                the updated plan automatically.
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '2rem' }}>
                Reference: <code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{reference}</code>
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard', { replace: true })}>
                  Go to Dashboard
                </button>
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
                Your payment could not be processed. No charge was made to your account.
                Please try again or choose a different payment method.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/pricing')}>Try Again</button>
                <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
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
                This page is shown after completing a payment. If you arrived here
                by mistake, head back to pricing.
              </p>
              <Link to="/pricing" className="btn btn-primary">View Pricing</Link>
            </>
          )}

        </div>
      </main>
    </Layout>
  );
}
