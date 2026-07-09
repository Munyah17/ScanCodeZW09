import { useState, useRef, useEffect, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import {
  COUNTRY_STANDARDS,
  COUNTRY_INFO,
  VARIATION_EXAMPLES,
  formatEAN13Display,
  generateEAN13,
} from '../utils/barcodeUtils';
import DashLayout from '../components/DashLayout';
import Alert from '../components/Alert';

const EMPTY_FORM = {
  existing_product_id: '',
  product_name: '',
  category: '',
  variation_type: '',
  variation_value: '',
  barcode_country: 'ZW',
  generate_qrcode: true,
};

const PLAN_LIMITS = {
  starter:    { max_products: 3,    max_variations_per_product: 3   },
  business:   { max_products: 20,   max_variations_per_product: 15  },
  pro:        { max_products: 100,  max_variations_per_product: 50  },
  lifetime:   { max_products: null, max_variations_per_product: null },
  enterprise: { max_products: null, max_variations_per_product: null },
};

export default function GenerateBarcode() {
  const { user } = useAuth();

  const [products,     setProducts]     = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [barcodeCount, setBarcodeCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [generated,    setGenerated]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [copyMsg,      setCopyMsg]      = useState('');
  const [qrDataUrl,    setQrDataUrl]    = useState('');

  const displaySvgRef = useRef(null);

  const isAdmin = user?.user_type === 'admin';

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!generated) return;
    const tid = setTimeout(() => renderDisplay(generated.barcode_data, generated.barcode_format, form.generate_qrcode), 80);
    return () => clearTimeout(tid);
  }, [generated]);

  const loadData = async () => {
    try {
      const res  = await fetch('/api/products/catalog', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      const enriched = data.products ?? [];
      setProducts(enriched);
      // Super Admin has unlimited access
      const planLimits = user?.isSuperAdmin ? { max_products: null, max_variations_per_product: null } : (data.subscription ?? PLAN_LIMITS[user.subscription_type] ?? PLAN_LIMITS.starter);
      setSubscription(planLimits);
      setProductCount(enriched.length);
      setBarcodeCount(data.barcode_count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  // Render the visible SVG barcode and generate the QR data URL
  const renderDisplay = (barcodeValue, format, doQR) => {
    const isUPCA = format === 'UPCA';
    const opts = {
      format:       isUPCA ? 'UPC' : 'EAN13',
      width:        2.2,
      height:       120,
      displayValue: false,
      margin:       10,
      background:   '#ffffff',
      lineColor:    '#000000',
    };
    try {
      if (displaySvgRef.current) JsBarcode(displaySvgRef.current, barcodeValue, opts);
    } catch (e) {
      console.error('[JsBarcode]', e.message);
    }
    if (doQR) {
      QRCode.toDataURL(barcodeValue, {
        width: 200, margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }).then(url => setQrDataUrl(url)).catch(console.error);
    } else {
      setQrDataUrl('');
    }
  };

  // Build a fully-composed barcode canvas (label + bars + number) using JsBarcode canvas mode
  const buildBarcodeCanvas = useCallback(() => {
    if (!generated) return null;
    const isUPCA = generated.barcode_format === 'UPCA';

    // Render barcode onto a scratch canvas
    const bcCanvas = document.createElement('canvas');
    try {
      JsBarcode(bcCanvas, generated.barcode_data, {
        format:       isUPCA ? 'UPC' : 'EAN13',
        width:        2.2,
        height:       120,
        displayValue: false,
        margin:       10,
        background:   '#ffffff',
        lineColor:    '#000000',
      });
    } catch (e) {
      console.error('[JsBarcode canvas]', e);
      return null;
    }

    // Compose: label + barcode + number on a white canvas
    const labelText  = generated.product_name
      + (generated.variation_value ? ` – ${generated.variation_value}` : '');
    const PAD_X      = 28;
    const PAD_TOP    = 20;
    const PAD_BOT    = 16;
    const LABEL_H    = 28;
    const NUM_H      = 26;
    const GAP        = 6;
    const W          = bcCanvas.width + PAD_X * 2;
    const H          = PAD_TOP + LABEL_H + GAP + bcCanvas.height + GAP + NUM_H + PAD_BOT;

    const out = document.createElement('canvas');
    out.width  = W;
    out.height = H;
    const ctx  = out.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle    = '#000000';
    ctx.font         = 'bold 17px Arial, Helvetica, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, W / 2, PAD_TOP, W - PAD_X * 2);

    ctx.drawImage(bcCanvas, PAD_X, PAD_TOP + LABEL_H + GAP);

    ctx.font = '14px "Courier New", Courier, monospace';
    ctx.fillText(
      formatEAN13Display(generated.barcode_data),
      W / 2,
      PAD_TOP + LABEL_H + GAP + bcCanvas.height + GAP,
      W - PAD_X * 2,
    );

    return out;
  }, [generated]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'existing_product_id' && value) {
      setForm(f => ({ ...f, [name]: value, product_name: '', category: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.existing_product_id && !form.product_name.trim()) {
      setError('Please select an existing product or enter a new product name.'); return;
    }
    if (!form.variation_type || !form.variation_value.trim()) {
      setError('Please fill in the variation type and value.'); return;
    }
    setSubmitting(true);
    try {
      const countryStd  = COUNTRY_STANDARDS[form.barcode_country] ?? COUNTRY_STANDARDS.ZW;
      const barcodeData = generateEAN13(form.barcode_country);

      const res  = await fetch('/api/barcodes/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
        body:    JSON.stringify({
          existing_product_id: form.existing_product_id || null,
          product_name:        form.product_name.trim(),
          category:            form.category.trim() || null,
          variation_type:      form.variation_type,
          variation_value:     form.variation_value.trim(),
          barcode_data:        barcodeData,
          barcode_format:      countryStd.standard_format,
          barcode_country:     form.barcode_country,
          generate_qrcode:     form.generate_qrcode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Failed to save barcode.'); return; }

      const { variation } = data;
      setGenerated(variation);
      setSuccess(`Barcode generated for ${variation.product_name} — ${form.variation_value}`);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download helpers (all use buildBarcodeCanvas — no html2canvas) ──────────

  const downloadPNG = useCallback(() => {
    if (!generated) return;
    const canvas = buildBarcodeCanvas();
    if (!canvas) return;
    // Scale to GS1 standard: 38mm @ 300 DPI = 449 px wide
    const TARGET = Math.round(38 / 25.4 * 300);
    const out    = document.createElement('canvas');
    out.width    = TARGET;
    out.height   = Math.round(canvas.height * TARGET / canvas.width);
    out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
    const link    = document.createElement('a');
    link.download = `barcode_${generated.barcode_data}.png`;
    link.href     = out.toDataURL('image/png');
    link.click();
  }, [generated, buildBarcodeCanvas]);

  const downloadJPEG = useCallback(() => {
    if (!generated) return;
    const canvas  = buildBarcodeCanvas();
    if (!canvas) return;
    const link    = document.createElement('a');
    link.download = `barcode_${generated.barcode_data}.jpg`;
    link.href     = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  }, [generated, buildBarcodeCanvas]);

  const generatePDF = useCallback(() => {
    if (!generated) return;
    const canvas = buildBarcodeCanvas();
    if (!canvas) return;
    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW   = 80;
    const imgH   = canvas.height * imgW / canvas.width;
    const x      = (pdf.internal.pageSize.getWidth() - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, 20, imgW, imgH);
    pdf.save(`barcode_${generated.barcode_data}.pdf`);
  }, [generated, buildBarcodeCanvas]);

  const printBarcode = useCallback(() => {
    if (!generated) return;
    const canvas = buildBarcodeCanvas();
    if (!canvas) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode</title>
      <style>body{margin:0;padding:20px;text-align:center;}img{max-width:100%;}</style>
      </head><body><img src="${canvas.toDataURL('image/png')}" /></body></html>`);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  }, [generated, buildBarcodeCanvas]);

  const copyBarcode = useCallback(async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.barcode_data);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 2000);
  }, [generated]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl || !generated) return;
    const link    = document.createElement('a');
    link.download = `qrcode_${generated.barcode_data}.png`;
    link.href     = qrDataUrl;
    link.click();
  }, [qrDataUrl, generated]);

  if (loading) return (
    <DashLayout active="generate" title="Generate Barcode">
      <div className="dp-loading"><div className="dp-spinner" /></div>
    </DashLayout>
  );

  const activePlan = user?.subscription_type;
  const hasAccess  = user?.isSuperAdmin || isAdmin || (activePlan && activePlan !== 'free' && PLAN_LIMITS[activePlan] !== undefined);
  if (!hasAccess) return (
    <DashLayout active="generate" title="Generate Barcode">
      <div className="dp-section" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Subscription required</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
          You need an active plan to generate barcodes. Choose a plan to get started — your account is ready, you just need to subscribe.
        </p>
        <a href="/pricing" className="dp-btn dp-btn-primary" style={{ display: 'inline-block', padding: '0.75rem 2rem', borderRadius: 10, textDecoration: 'none', fontSize: '1rem', fontWeight: 700 }}>
          View Plans &amp; Pricing
        </a>
      </div>
    </DashLayout>
  );

  const countryInfo = COUNTRY_INFO[form.barcode_country];
  const labelText   = generated
    ? `${generated.product_name}${generated.variation_value ? ' - ' + generated.variation_value : ''}`
    : '';

  return (
    <DashLayout active="generate" title="Generate Barcode">
      {error   && <Alert type="error"   message={error}   onClose={() => setError('')} dark />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} dark />}

      {/* ── Generated output ── */}
      {generated && (
        <>
          {/* Barcode card */}
          <div className="dp-card dp-generate-output" style={{ marginBottom: '1rem' }}>
            <h3 className="dp-generate-heading">
              <i className="fas fa-barcode" style={{ color: '#3b82f6' }}></i> Barcode
            </h3>

            <div className="dp-barcode-single-col">
              <div className="dp-professional-barcode">
                <div className="dp-barcode-product-label">{labelText}</div>
                <svg ref={displaySvgRef}></svg>
                <div className="dp-barcode-number">{formatEAN13Display(generated.barcode_data)}</div>
              </div>

              <div className="dp-barcode-meta">
                <span><strong>Format:</strong> {generated.barcode_format}</span>
                <span><strong>Country:</strong> {COUNTRY_STANDARDS[generated.barcode_country]?.country_name}</span>
                <span><strong>Check digit:</strong> {generated.barcode_data.slice(-1)}</span>
              </div>
            </div>

            {/* Download bar */}
            <div className="dp-download-options" style={{ marginTop: '1.25rem' }}>
              <h4><i className="fas fa-download"></i> Download Barcode</h4>
              <div className="dp-download-buttons">
                <button onClick={downloadPNG}  className="dp-btn dp-btn-primary"><i className="fas fa-image"></i> PNG (38mm·300dpi)</button>
                <button onClick={downloadJPEG} className="dp-btn dp-btn-ghost"><i className="fas fa-image"></i> JPEG</button>
                <button onClick={generatePDF}  className="dp-btn dp-btn-ghost"><i className="fas fa-file-pdf"></i> PDF</button>
                <button onClick={printBarcode}  className="dp-btn dp-btn-ghost"><i className="fas fa-print"></i> Print</button>
                <button onClick={copyBarcode}   className="dp-btn dp-btn-ghost">
                  <i className={`fas fa-${copyMsg ? 'check' : 'copy'}`}></i> {copyMsg || 'Copy Number'}
                </button>
              </div>
            </div>
          </div>

          {/* QR code card — separate from barcode */}
          {form.generate_qrcode && qrDataUrl && (
            <div className="dp-card dp-generate-output" style={{ marginBottom: '1.25rem' }}>
              <h3 className="dp-generate-heading">
                <i className="fas fa-qrcode" style={{ color: '#10b981' }}></i> QR Code
              </h3>

              <div className="dp-qrcode-standalone">
                <img src={qrDataUrl} alt="QR Code" width={180} height={180} />
                <div className="dp-qrcode-info">
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>
                    Encodes the barcode number — scan to verify product identity.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '0 0 1rem', fontFamily: 'monospace' }}>
                    {generated.barcode_data}
                  </p>
                  <button onClick={downloadQR} className="dp-btn dp-btn-primary">
                    <i className="fas fa-download"></i> Download QR PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Form ── */}
      <div className="dp-card">
        <form onSubmit={handleSubmit}>

          {/* Product */}
          <div className="dp-generate-section">
            <h3 className="dp-generate-section-title"><i className="fas fa-box"></i> Product</h3>
            <div className="dp-form-row">
              <label className="dp-label">Use existing product</label>
              <select name="existing_product_id" className="dp-select" value={form.existing_product_id} onChange={handleChange}>
                <option value="">— Create new product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}{p.category ? ` (${p.category})` : ''} — {p.variation_count} variation{p.variation_count !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            {!form.existing_product_id && (
              <>
                <div className="dp-form-row">
                  <label className="dp-label">Product Name *</label>
                  <input type="text" name="product_name" className="dp-input" required={!form.existing_product_id}
                    placeholder="e.g., Green Peppers, Broccoli, Cauliflower Mix"
                    value={form.product_name} onChange={handleChange} />
                </div>
                <div className="dp-form-row">
                  <label className="dp-label">Category</label>
                  <input type="text" name="category" className="dp-input"
                    placeholder="e.g., Vegetables, Dairy, Packaged Goods"
                    value={form.category} onChange={handleChange} />
                </div>
              </>
            )}
          </div>

          {/* Variation */}
          <div className="dp-generate-section">
            <h3 className="dp-generate-section-title"><i className="fas fa-tags"></i> Variation</h3>
            <div className="dp-form-row">
              <label className="dp-label">Variation Type *</label>
              <select name="variation_type" className="dp-select" required value={form.variation_type} onChange={handleChange}>
                <option value="">— Select type —</option>
                {Object.keys(VARIATION_EXAMPLES).map(k => (
                  <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Variation Value *</label>
              <input type="text" name="variation_value" className="dp-input" required
                placeholder={VARIATION_EXAMPLES[form.variation_type] || 'e.g., 200g, Red, Strawberry'}
                value={form.variation_value} onChange={handleChange} />
            </div>
          </div>

          {/* Barcode settings */}
          <div className="dp-generate-section">
            <h3 className="dp-generate-section-title"><i className="fas fa-globe"></i> Barcode Settings</h3>
            <div className="dp-form-row">
              <label className="dp-label">Country Standard *</label>
              <select name="barcode_country" className="dp-select" value={form.barcode_country} onChange={handleChange}>
                {Object.entries(COUNTRY_STANDARDS).map(([code, info]) => (
                  <option key={code} value={code}>{info.country_name} — {info.standard_format} (prefix {info.prefix})</option>
                ))}
              </select>
            </div>
            {countryInfo && (
              <div className="dp-info-box">
                <h4 className="dp-info-box-title"><i className="fas fa-info-circle"></i> {countryInfo.title}</h4>
                <div className="dp-info-box-grid">
                  {countryInfo.details.map(d => (
                    <p key={d.key}><strong>{d.key}:</strong> {d.value}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="dp-form-row" style={{ marginTop: '1rem' }}>
              <label className="dp-checkbox-label">
                <input type="checkbox" name="generate_qrcode" checked={form.generate_qrcode} onChange={handleChange} />
                <i className="fas fa-qrcode"></i> Also generate QR Code <span style={{ color: '#10b981', fontSize: '0.8rem' }}>(free for subscribers)</span>
              </label>
            </div>
          </div>

          <div className="dp-generate-actions">
            <button type="submit" className="dp-btn dp-btn-primary" disabled={submitting}>
              <i className="fas fa-barcode"></i> {submitting ? 'Generating…' : 'Generate Barcode'}
            </button>
            <button type="button" className="dp-btn dp-btn-ghost" onClick={() => {
              setForm(EMPTY_FORM); setGenerated(null); setQrDataUrl(''); setError(''); setSuccess('');
            }}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </DashLayout>
  );
}
