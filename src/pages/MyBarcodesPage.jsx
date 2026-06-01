import { useState, useEffect, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatEAN13Display, COUNTRY_STANDARDS } from '../utils/barcodeUtils';
import DashLayout from '../components/DashLayout';
import { Link } from 'react-router-dom';

// ── Single barcode card ───────────────────────────────────────────────────────
function BarcodeCard({ variation }) {
  const svgRef  = useRef(null);
  const cardRef = useRef(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [qrUrl,   setQrUrl]   = useState(variation.qr_code_url ?? '');

  useEffect(() => {
    if (!svgRef.current) return;
    const fmt = variation.barcode_format === 'UPCA' ? 'UPC' : 'EAN13';
    try {
      JsBarcode(svgRef.current, variation.barcode_data, {
        format: fmt, width: 1.6, height: 72,
        displayValue: false, margin: 4,
        background: '#ffffff', lineColor: '#000000',
      });
    } catch { /* ignore invalid */ }
  }, [variation.barcode_data, variation.barcode_format]);

  useEffect(() => {
    if (qrUrl || !variation.qrcode_generated) return;
    QRCode.toDataURL(variation.barcode_data, { width: 160, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrUrl).catch(() => {});
  }, [variation.barcode_data, variation.qrcode_generated]);

  const label = `${variation.product_name}${variation.variation_value ? ' – ' + variation.variation_value : ''}`;

  const downloadPNG = useCallback(async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: '#fff', scale: 3, useCORS: true });
    const TARGET = Math.round(38 / 25.4 * 300);
    const out    = document.createElement('canvas');
    out.width    = TARGET;
    out.height   = Math.round(canvas.height * (TARGET / canvas.width));
    out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
    const link   = document.createElement('a');
    link.download = `barcode_${variation.barcode_data}.png`;
    link.href    = out.toDataURL('image/png');
    link.click();
  }, [variation.barcode_data]);

  const downloadPDF = useCallback(async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: '#fff', scale: 3 });
    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW   = 80;
    const imgH   = (canvas.height * imgW) / canvas.width;
    const x      = (pdf.internal.pageSize.getWidth() - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, 20, imgW, imgH);
    pdf.save(`barcode_${variation.barcode_data}.pdf`);
  }, [variation.barcode_data]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(variation.barcode_data);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 2000);
  }, [variation.barcode_data]);

  return (
    <div className="dp-barcode-card">
      <div className="dp-barcode-export" ref={cardRef} style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <div style={{ fontSize: '0.65rem', color: '#374151', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <svg ref={svgRef} style={{ display: 'block', margin: '0 auto' }}></svg>
        <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 2, letterSpacing: 2 }}>{formatEAN13Display(variation.barcode_data)}</div>
      </div>

      {qrUrl && (
        <div style={{ textAlign: 'center', padding: '0.4rem 0', background: '#fff' }}>
          <img src={qrUrl} alt="QR" width={64} height={64} style={{ display: 'inline-block' }} />
        </div>
      )}

      <div className="dp-barcode-meta">
        <span className="dp-badge dp-badge-blue" style={{ fontSize: '0.68rem' }}>{variation.barcode_format}</span>
        <span className="dp-badge dp-badge-gray" style={{ fontSize: '0.68rem' }}>
          {COUNTRY_STANDARDS[variation.barcode_country]?.country_name ?? variation.barcode_country}
        </span>
        {variation.qrcode_generated && <span className="dp-badge dp-badge-green" style={{ fontSize: '0.68rem' }}>QR</span>}
      </div>

      <div className="dp-barcode-date">{new Date(variation.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>

      <div className="dp-barcode-actions">
        <button className="dp-btn dp-btn-primary dp-btn-sm" onClick={downloadPNG}>PNG</button>
        <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={downloadPDF}>PDF</button>
        <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={copy}>{copyMsg || 'Copy'}</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MyBarcodesPage() {
  const { user } = useAuth();
  const [variations,  setVariations]  = useState([]);
  const [products,    setProducts]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState('');
  const [search,      setSearch]      = useState('');
  const [filterProd,  setFilterProd]  = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const [{ data: vars, error: varErr }, { data: prods }] = await Promise.all([
      supabase.from('variations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('products').select('id, product_name').eq('user_id', user.id),
    ]);
    if (varErr) { setErr(varErr.message); setLoading(false); return; }
    const prodMap = (prods ?? []).reduce((acc, p) => { acc[p.id] = p.product_name; return acc; }, {});
    setVariations((vars ?? []).map(v => ({ ...v, product_name: prodMap[v.product_id] ?? 'Unknown' })));
    setProducts(prodMap);
    setLoading(false);
  };

  const filtered = variations.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || v.barcode_data.includes(search)
      || v.product_name.toLowerCase().includes(q)
      || v.variation_value.toLowerCase().includes(q);
    const matchProd = !filterProd || String(v.product_id) === filterProd;
    return matchSearch && matchProd;
  });

  const actions = (
    <Link to="/generate-barcode" className="dp-btn dp-btn-primary">+ Generate</Link>
  );

  return (
    <DashLayout active="barcodes" title="My Barcodes" actions={actions}>
      {err && <div className="dp-alert dp-alert-error">{err}</div>}

      {/* Filter bar */}
      <div className="dp-filterbar">
        <input
          className="dp-input"
          style={{ maxWidth: 260 }}
          placeholder="Search by product, barcode, or variation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="dp-select" style={{ maxWidth: 200 }} value={filterProd} onChange={e => setFilterProd(e.target.value)}>
          <option value="">All products</option>
          {Object.entries(products).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <span className="dp-filterbar-count">{filtered.length} barcode{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="dp-loading"><div className="dp-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="dp-empty">
          <div className="dp-empty-icon">📊</div>
          {variations.length === 0
            ? <><p>No barcodes yet.</p><Link to="/generate-barcode" className="dp-btn dp-btn-primary" style={{ marginTop: '0.75rem' }}>Generate your first barcode</Link></>
            : <p>No barcodes match your search.</p>
          }
        </div>
      ) : (
        <div className="dp-barcode-grid">
          {filtered.map(v => <BarcodeCard key={v.id} variation={v} />)}
        </div>
      )}
    </DashLayout>
  );
}
