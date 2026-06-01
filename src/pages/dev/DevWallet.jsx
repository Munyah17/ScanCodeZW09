import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DevPortalLayout from './DevPortalLayout';

const API     = import.meta.env.DEV ? 'http://localhost:3042' : '';
const AMOUNTS = [5, 10, 25, 50, 100, 250];

function TxnRow({ t }) {
  const credit = t.amount > 0;
  return (
    <tr style={{ borderTop: '1px solid #21262d' }}>
      <td style={{ padding: '0.55rem 0.75rem', color: '#8b949e', fontSize: '0.75rem' }}>
        {new Date(t.created_at).toLocaleString()}
      </td>
      <td style={{ padding: '0.55rem 0.75rem' }}>
        <span style={{ background: credit ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)', color: credit ? '#3fb950' : '#f85149', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.72rem', textTransform: 'uppercase' }}>
          {t.type}
        </span>
      </td>
      <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.82rem', color: '#c9d1d9' }}>{t.description}</td>
      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 600, color: credit ? '#3fb950' : '#f85149', fontFamily: 'monospace' }}>
        {credit ? '+' : ''}{parseFloat(t.amount).toFixed(6)}
      </td>
      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#8b949e', fontFamily: 'monospace', fontSize: '0.78rem' }}>
        {parseFloat(t.balance_after).toFixed(6)}
      </td>
    </tr>
  );
}

export default function DevWallet() {
  const { user, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();

  const [wallet, setWallet]     = useState(null);
  const [txns,   setTxns]       = useState([]);
  const [total,  setTotal]      = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [amount,  setAmount]    = useState(10);
  const [custom,  setCustom]    = useState('');
  const [gateway, setGateway]   = useState('stripe');
  const [topping, setTopping]   = useState(false);
  const [msg,     setMsg]       = useState('');
  const [err,     setErr]       = useState('');

  const toppedUp = searchParams.get('topped_up') === 'true';

  useEffect(() => {
    load(0);
    if (toppedUp) { setMsg('Top-up successful! Your wallet balance has been updated.'); refreshProfile(); }
  }, []);

  async function load(off = 0) {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dev/wallet?limit=20&offset=${off}`, { headers: { Authorization: `Bearer ${user.accessToken}` } });
      const data = await res.json();
      setWallet(data.wallet ?? null);
      setTxns(off === 0 ? (data.transactions ?? []) : prev => [...prev, ...(data.transactions ?? [])]);
      setTotal(data.total ?? 0);
      setOffset(off);
    } catch {}
    setLoading(false);
  }

  async function handleTopup() {
    const usd = custom ? parseFloat(custom) : amount;
    if (!usd || usd < 5) { setErr('Minimum top-up is $5.'); return; }
    if (usd > 500)        { setErr('Maximum top-up is $500.'); return; }
    setTopping(true); setErr('');
    try {
      const res  = await fetch(`${API}/api/dev/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
        body: JSON.stringify({ amount: usd, gateway }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to initiate top-up.'); return; }
      const url = data.url || data.redirectUrl;
      if (url) window.open(url, '_blank');
    } catch (e) { setErr(e.message); }
    setTopping(false);
  }

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;

  return (
    <DevPortalLayout title="Wallet">
      {msg && (
        <div style={{ background: 'rgba(63,185,80,0.12)', border: '1px solid #3fb950', borderRadius: 6, padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#3fb950', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          {msg} <span style={{ cursor: 'pointer' }} onClick={() => setMsg('')}>✕</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left: balance + history */}
        <div>
          {/* Balance card */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Available Balance</div>
            {loading && !wallet ? (
              <div style={{ color: '#484f58' }}>Loading…</div>
            ) : wallet ? (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: wallet.balance < 1 ? '#f85149' : '#3fb950', fontFamily: 'monospace' }}>
                  ${parseFloat(wallet.balance).toFixed(4)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#484f58', marginTop: '0.25rem' }}>USD · {wallet.status}</div>
              </>
            ) : (
              <div style={{ color: '#8b949e', fontSize: '0.875rem' }}>Wallet not yet activated. <a href="/dev" style={{ color: '#58a6ff' }}>Go to Overview</a> to enable.</div>
            )}
          </div>

          {/* Transaction history */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #30363d', fontSize: '0.78rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transaction Ledger
            </div>
            {txns.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#484f58', fontSize: '0.85rem' }}>No transactions yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#21262d' }}>
                      {['Date', 'Type', 'Description', 'Amount', 'Balance'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: h === 'Amount' || h === 'Balance' ? 'right' : 'left', color: '#8b949e', fontWeight: 500, fontSize: '0.72rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map(t => <TxnRow key={t.id} t={t} />)}
                  </tbody>
                </table>
              </div>
            )}
            {txns.length < total && (
              <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <button onClick={() => load(offset + 20)} style={{ background: 'none', border: '1px solid #30363d', color: '#58a6ff', borderRadius: 4, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: top-up form */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '0.875rem', marginBottom: '1rem' }}>Top Up Wallet</div>

          {err && <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#f85149', marginBottom: '0.75rem' }}>{err}</div>}

          {/* Quick amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => { setAmount(a); setCustom(''); }}
                style={{ padding: '0.45rem', fontSize: '0.8rem', borderRadius: 4, cursor: 'pointer', border: `1px solid ${amount === a && !custom ? '#58a6ff' : '#30363d'}`, background: amount === a && !custom ? 'rgba(88,166,255,0.12)' : '#21262d', color: amount === a && !custom ? '#58a6ff' : '#c9d1d9' }}
              >
                ${a}
              </button>
            ))}
          </div>

          {/* Custom */}
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              type="number" min="5" max="500" placeholder="Custom amount ($5–$500)"
              value={custom} onChange={e => setCustom(e.target.value)}
              style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, padding: '0.5rem 0.6rem', color: '#c9d1d9', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Gateway */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: '0.4rem' }}>Payment method</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[['stripe', 'Stripe (Card)'], ['paynow', 'Paynow (ZW)']].map(([gw, label]) => (
                <button key={gw} onClick={() => setGateway(gw)}
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', borderRadius: 4, cursor: 'pointer', border: `1px solid ${gateway === gw ? '#58a6ff' : '#30363d'}`, background: gateway === gw ? 'rgba(88,166,255,0.12)' : '#21262d', color: gateway === gw ? '#58a6ff' : '#8b949e' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleTopup}
            disabled={topping || finalAmount < 5}
            style={{ width: '100%', background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 600, cursor: topping || finalAmount < 5 ? 'not-allowed' : 'pointer', opacity: topping || finalAmount < 5 ? 0.6 : 1 }}
          >
            {topping ? 'Redirecting…' : `Top Up $${finalAmount.toFixed(2)}`}
          </button>

          <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#484f58', lineHeight: 1.5, textAlign: 'center' }}>
            Funds are non-refundable. API usage is deducted per successful operation.
          </div>
        </div>
      </div>
    </DevPortalLayout>
  );
}
