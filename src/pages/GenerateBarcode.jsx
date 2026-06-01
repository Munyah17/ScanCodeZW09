import { useState, useRef, useEffect, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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

// Plan limits fallback (used if subscription query returns null)
const PLAN_LIMITS = {
  free:       { max_products: 1,   max_variations_per_product: 1   },
  starter:    { max_products: 3,   max_variations_per_product: 3   },
  business:   { max_products: 20,  max_variations_per_product: 15  },
  pro:        { max_products: 100, max_variations_per_product: 50  },
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

  const displaySvgRef  = useRef(null);
  const exportSvgRef   = useRef(null);
  const exportDivRef   = useRef(null);

  const isAdmin = user?.user_type === 'admin';

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!generated) return;
    const tid = setTimeout(() => renderBarcodes(generated.barcode_data, generated.barcode_format, form.generate_qrcode), 80);
    return () => clearTimeout(tid);
  }, [generated]);

  const loadData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const [{ data: prods }, { data: vars }, { data: plan }] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('variations').select('product_id').eq('user_id', user.id),
        supabase.from('subscription_plans').select('*').eq('id', user.subscription_type).maybeSingle(),
      ]);

      const countByProduct = (vars ?? []).reduce((acc, v) => {
        acc[v.product_id] = (acc[v.product_id] || 0) + 1;
        return acc;
      }, {});

      const enriched = (prods ?? []).map(p => ({
        ...p,
        variation_count: countByProduct[p.id] ?? 0,
      }));

      setProducts(enriched);
      setSubscription(plan ?? PLAN_LIMITS[user.subscription_type] ?? PLAN_LIMITS.starter);
      setProductCount(enriched.length);
      setBarcodeCount((vars ?? []).length);
    } finally {
      setLoading(false);
    }
  };

  const renderBarcodes = (barcodeValue, format, doQR) => {
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
      if (exportSvgRef.current)  JsBarcode(exportSvgRef.current,  barcodeValue, opts);
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
    if (!supabase) { setError('Database not configured.'); return; }

    setSubmitting(true);
    try {
      // Admins have unlimited access; regular users check plan limits
      const fallback    = PLAN_LIMITS[user.subscription_type] ?? PLAN_LIMITS.starter;
      const rawMaxP     = user?.enterprise_config?.max_products   ?? subscription?.max_products   ?? fallback.max_products;
      const rawMaxV     = user?.enterprise_config?.max_variations ?? subscription?.max_variations_per_product ?? fallback.max_variations_per_product;
      const maxProducts   = isAdmin || rawMaxP === null ? Infinity : rawMaxP;
      const maxVariations = isAdmin || rawMaxV === null ? Infinity : rawMaxV;

      let productId         = form.existing_product_id ? parseInt(form.existing_product_id, 10) : null;
      let actualProductName = '';

      if (!productId) {
        if (productCount >= maxProducts) {
          setError(`You have reached your ${maxProducts}-product limit. Please upgrade your plan.`); return;
        }
        const { data: newProduct, error: productErr } = await supabase
          .from('products')
          .insert({ user_id: user.id, product_name: form.product_name.trim(), category: form.category.trim() || null })
          .select()
          .single();
        if (productErr) { setError('Failed to create product: ' + productErr.message); return; }
        productId         = newProduct.id;
        actualProductName = newProduct.product_name;
      } else {
        actualProductName = products.find(p => p.id === productId)?.product_name ?? '';
      }

      const { count: variationCount } = await supabase
        .from('variations')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if ((variationCount ?? 0) >= maxVariations) {
        setError(`This product has reached its ${maxVariations}-variation limit. Please upgrade your plan.`); return;
      }

      const countryStd  = COUNTRY_STANDARDS[form.barcode_country] ?? COUNTRY_STANDARDS.ZW;
      const barcodeData = generateEAN13(form.barcode_country);

      // Generate QR data URL to store
      let qrUrl = null;
      if (form.generate_qrcode) {
        try {
          qrUrl = await QRCode.toDataURL(barcodeData, { width: 200, margin: 2, errorCorrectionLevel: 'M' });
        } catch { /* non-fatal */ }
      }

      const { data: newVariation, error: varErr } = await supabase
        .from('variations')
        .insert({
          product_id:       productId,
          user_id:          user.id,
          variation_type:   form.variation_type,
          variation_value:  form.variation_value.trim(),
          barcode_data:     barcodeData,
          barcode_format:   countryStd.standard_format,
          barcode_country:  form.barcode_country,
          qrcode_generated: form.generate_qrcode,
        })
        .select()
        .single();

      if (varErr) { setError('Failed to save barcode: ' + varErr.message); return; }

      setGenerated({ ...newVariation, product_name: actualProductName });
      setSuccess(`Barcode generated for ${actualProductName} — ${form.variation_value}`);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Export helpers ─────────────────────────────────────────────────────────

  const captureCanvas = useCallback(async () => {
    if (!exportDivRef.current) return null;
    return html2canvas(exportDivRef.current, { backgroundColor: '#ffffff', scale: 3, useCORS: true });
  }, []);

  const downloadPNG = useCallback(async () => {
    if (!generated) return;
    const canvas  = await captureCanvas();
    if (!canvas) return;
    // Scale to 38mm @ 300 DPI = 449px wide
    const TARGET  = Math.round(38 / 25.4 * 300);
    const out     = document.createElement('canvas');
    out.width     = TARGET;
    out.height    = Math.round(canvas.height * (TARGET / canvas.width));
    out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
    const link    = document.createElement('a');
    link.download = `barcode_${generated.barcode_data}.png`;
    link.href     = out.toDataURL('image/png');
    link.click();
  }, [generated, captureCanvas]);

  const downloadJPEG = useCallback(async () => {
    if (!generated) return;
    const canvas  = await captureCanvas();
    if (!canvas) return;
    const link    = document.createElement('a');
    link.download = `barcode_${generated.barcode_data}.jpg`;
    link.href     = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  }, [generated, captureCanvas]);

  const generatePDF = useCallback(async () => {
    if (!generated) return;
    const canvas = await captureCanvas();
    if (!canvas) return;
    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW   = 80;
    const imgH   = (canvas.height * imgW) / canvas.width;
    const x      = (pdf.internal.pageSize.getWidth() - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, 20, imgW, imgH);
    pdf.save(`barcode_${generated.barcode_data}.pdf`);
  }, [generated, captureCanvas]);

  const printBarcode = useCallback(async () => {
    if (!exportDivRef.current) return;
    const canvas = await captureCanvas();
    if (!canvas) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode</title>
      <style>body{margin:0;padding:20px;text-align:center;}img{max-width:100%;}</style>
      </head><body><img src="${canvas.toDataURL('image/png')}" /></body></html>`);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  }, [captureCanvas]);

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
        <div className="dp-card dp-generate-output">
          <h3 className="dp-generate-heading"><i className="fas fa-check-circle" style={{ color: '#10b981' }}></i> Barcode Generated</h3>

          <div className="dp-barcode-display">

            {/* Barcode card — matches GS1 retail layout */}
            <div className="dp-barcode-image-container">
              {/* Hidden export element captured by html2canvas */}
              <div
                ref={exportDivRef}
                style={{
                  position: 'absolute', left: '-9999px', top: 0,
                  background: '#fff', padding: '20px 24px 14px',
                  display: 'inline-block', textAlign: 'center',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  color: '#000',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '17px', marginBottom: '8px', letterSpacing: '0.02em', color: '#000' }}>
                  {labelText}
                </div>
                <svg ref={exportSvgRef} style={{ display: 'block', margin: '0 auto' }}></svg>
                <div style={{ fontSize: '14px', letterSpacing: '4px', marginTop: '6px', fontFamily: "'Courier New', monospace", color: '#000' }}>
                  {formatEAN13Display(generated.barcode_data)}
                </div>
              </div>

              {/* Visible card — white background for scannability */}
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

            {/* QR code */}
            {form.generate_qrcode && qrDataUrl && (
              <div className="dp-qrcode-container">
                <h4>QR Code</h4>
                <img src={qrDataUrl} alt="QR Code" width={180} height={180} style={{ display: 'block', margin: '0 auto 0.75rem', borderRadius: 8 }} />
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>Scan to verify product barcode</p>
                <button onClick={downloadQR} className="dp-btn dp-btn-ghost dp-btn-sm">
                  <i className="fas fa-download"></i> Download QR PNG
                </button>
              </div>
            )}
          </div>

          {/* Download bar */}
          <div className="dp-download-options">
            <h4><i className="fas fa-download"></i> Download &amp; Export</h4>
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
