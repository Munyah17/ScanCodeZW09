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
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
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

export default function GenerateBarcode() {
  const { user } = useAuth();

  const [products,     setProducts]     = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [generated,    setGenerated]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [copyMsg,      setCopyMsg]      = useState('');
  const [qrDataUrl,    setQrDataUrl]    = useState('');

  const displaySvgRef = useRef(null);
  const exportSvgRef  = useRef(null);
  const exportDivRef  = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!generated) return;
    const tid = setTimeout(() => renderBarcodes(generated.barcode_data, form.generate_qrcode), 80);
    return () => clearTimeout(tid);
  }, [generated]);

  const loadData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const [{ data: prods }, { data: vars }, { data: plan }] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('variations').select('product_id').eq('user_id', user.id),
        supabase.from('subscription_plans').select('*').eq('id', user.subscription_type).single(),
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
      setSubscription(plan);
      setProductCount(enriched.length);
    } finally {
      setLoading(false);
    }
  };

  const renderBarcodes = (barcodeValue, doQR) => {
    const opts = {
      format: 'EAN13', width: 2, height: 100,
      displayValue: false, fontSize: 16, margin: 10,
      background: '#ffffff', lineColor: '#000000',
    };
    if (displaySvgRef.current) JsBarcode(displaySvgRef.current, barcodeValue, opts);
    if (exportSvgRef.current)  JsBarcode(exportSvgRef.current,  barcodeValue, opts);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.existing_product_id && !form.product_name.trim()) {
      setError('Please select an existing product or enter a new product name.'); return;
    }
    if (!form.variation_type || !form.variation_value.trim()) {
      setError('Please fill in all variation details.'); return;
    }
    if (!supabase) { setError('Database not configured.'); return; }

    setSubmitting(true);
    try {
      const maxProducts   = user?.enterprise_config?.max_products   ?? subscription?.max_products   ?? 0;
      const maxVariations = user?.enterprise_config?.max_variations  ?? subscription?.max_variations_per_product ?? 0;

      let productId         = form.existing_product_id ? parseInt(form.existing_product_id, 10) : null;
      let actualProductName = '';

      if (!productId) {
        if (productCount >= maxProducts) {
          setError('You have reached your product limit. Please upgrade your plan.'); return;
        }
        const { data: newProduct, error: productErr } = await supabase
          .from('products')
          .insert({ user_id: user.id, product_name: form.product_name.trim(), category: form.category.trim() || null })
          .select()
          .single();
        if (productErr) { setError('Failed to create product. Please try again.'); return; }
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
        setError('This product has reached its variation limit. Please upgrade your plan.'); return;
      }

      const countryStd  = COUNTRY_STANDARDS[form.barcode_country] ?? COUNTRY_STANDARDS.ZW;
      const barcodeData = generateEAN13(form.barcode_country);

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

      if (varErr) { setError('Failed to generate barcode. Please try again.'); return; }

      setGenerated({ ...newVariation, product_name: actualProductName });
      setSuccess(`Barcode generated! Product: ${actualProductName} | Variation: ${form.variation_value} | Format: ${countryStd.standard_format} (${countryStd.country_name})`);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download helpers (exact port of PHP) ───────────────────────────────────

  const downloadPNG = useCallback(async () => {
    if (!exportDivRef.current || !generated) return;
    const DPI        = 300;
    const TARGET_MM  = 38;
    const TARGET_PX  = Math.round(TARGET_MM / 25.4 * DPI);   // 38mm @ 300 DPI
    const canvas     = await html2canvas(exportDivRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const scale      = TARGET_PX / canvas.width;
    const out        = document.createElement('canvas');
    out.width        = TARGET_PX;
    out.height       = Math.round(canvas.height * scale);
    out.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
    const link       = document.createElement('a');
    link.download    = `barcode_${generated.barcode_data}.png`;
    link.href        = out.toDataURL('image/png');
    link.click();
  }, [generated]);

  const generatePDF = useCallback(async () => {
    if (!exportDivRef.current || !generated) return;
    const canvas  = await html2canvas(exportDivRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW    = 80;
    const imgH    = (canvas.height * imgW) / canvas.width;
    const x       = (pdf.internal.pageSize.getWidth() - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, 20, imgW, imgH);
    pdf.save(`barcode_${generated.barcode_data}.pdf`);
  }, [generated]);

  const printBarcode = useCallback(() => {
    if (!exportDivRef.current) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode</title>
      <style>body{margin:0;padding:20px;font-family:Arial,sans-serif;}svg{max-width:100%;}</style>
      </head><body>${exportDivRef.current.outerHTML}</body></html>`);
    win.document.close();
    win.print();
    win.close();
  }, []);

  const copyBarcode = useCallback(async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.barcode_data);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 2000);
  }, [generated]);

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;

  const countryInfo = COUNTRY_INFO[form.barcode_country];

  return (
    <Layout>
      <main className="dashboard">
        <Sidebar activeItem="generate" productCount={productCount} subscription={subscription} />

        <div className="main-content">
          <div className="dashboard-header">
            <h1>Generate Professional Barcode</h1>
            <p>Create industry-standard EAN-13 barcodes for your products</p>
          </div>

          {error   && <Alert type="error"   message={error}   onClose={() => setError('')} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

          {/* ── Generated barcode output ── */}
          {generated && (
            <div className="generated-barcode-section">
              <h3><i className="fas fa-barcode"></i> Generated Barcode</h3>

              <div className="barcode-display">
                <div className="barcode-image-container">
                  <h4>EAN-13 Barcode ({COUNTRY_STANDARDS[generated.barcode_country]?.country_name ?? 'Zimbabwe'})</h4>

                  {/* Off-screen export template — captured by html2canvas */}
                  <div ref={exportDivRef} style={{ position: 'absolute', left: '-9999px', top: 0, background: 'white', padding: '20px', display: 'inline-block' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
                      {generated.product_name}{generated.variation_value ? ` - ${generated.variation_value}` : ''}
                    </div>
                    <div style={{ textAlign: 'center' }}><svg ref={exportSvgRef}></svg></div>
                    <div style={{ fontSize: '16px', letterSpacing: '2px', marginTop: '5px', fontFamily: "'Courier New', monospace", textAlign: 'center' }}>
                      {formatEAN13Display(generated.barcode_data)}
                    </div>
                  </div>

                  {/* Visible display */}
                  <div className="professional-barcode">
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
                      {generated.product_name}{generated.variation_value ? ` - ${generated.variation_value}` : ''}
                    </div>
                    <svg ref={displaySvgRef}></svg>
                    <div className="barcode-number">{formatEAN13Display(generated.barcode_data)}</div>
                  </div>
                </div>

                {form.generate_qrcode && qrDataUrl && (
                  <div className="qrcode-image-container">
                    <h4>QR Code</h4>
                    <img src={qrDataUrl} alt="QR Code" width={200} height={200} style={{ display: 'block', margin: '0 auto' }} />
                    <p>Scan to view product details</p>
                    <a
                      href={qrDataUrl}
                      download={`qrcode_${generated.barcode_data}.png`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-block', marginTop: '0.75rem' }}
                    >
                      <i className="fas fa-download"></i> Download QR
                    </a>
                  </div>
                )}
              </div>

              <div className="barcode-details">
                <h4>Barcode Information</h4>
                <div className="details-grid">
                  <div className="detail-item"><strong>Product:</strong> {generated.product_name}</div>
                  <div className="detail-item"><strong>Variation:</strong> {generated.variation_value} ({generated.variation_type})</div>
                  <div className="detail-item"><strong>Barcode Number:</strong> <code>{generated.barcode_data}</code></div>
                  <div className="detail-item"><strong>Format:</strong> EAN-13 (13 digits)</div>
                  <div className="detail-item"><strong>Country Prefix:</strong> 977 (Zimbabwe)</div>
                  <div className="detail-item"><strong>Check Digit:</strong> {generated.barcode_data.slice(-1)}</div>
                </div>
              </div>

              <div className="download-options">
                <h4>Download Options</h4>
                <div className="download-buttons">
                  <button onClick={downloadPNG} className="btn btn-primary"><i className="fas fa-download"></i> Download PNG</button>
                  <button onClick={generatePDF} className="btn btn-secondary"><i className="fas fa-file-pdf"></i> Generate PDF</button>
                  <button onClick={printBarcode} className="btn btn-outline"><i className="fas fa-print"></i> Print</button>
                  <button onClick={copyBarcode}  className="btn btn-outline">
                    <i className={`fas fa-${copyMsg ? 'check' : 'copy'}`}></i> {copyMsg || 'Copy Barcode'}
                  </button>
                </div>
                <div className="print-options">
                  <h5>Print Settings</h5>
                  <p><small><i className="fas fa-info-circle"></i> For best results: Print at 100% scale · Use high-quality paper · Barcode width should be 38mm</small></p>
                </div>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <div className="form-container">
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3><i className="fas fa-box"></i> Product Information</h3>
                <div className="form-group">
                  <label>Select Existing Product (Optional)</label>
                  <select name="existing_product_id" className="form-select" value={form.existing_product_id} onChange={handleChange}>
                    <option value="">-- Select existing product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}{p.category ? ` (${p.category})` : ''}</option>
                    ))}
                  </select>
                  <p className="form-hint">Or create a new product below</p>
                </div>
                <div className="form-group">
                  <label>New Product Name {!form.existing_product_id && '*'}</label>
                  <input type="text" name="product_name" className="form-input"
                    placeholder="e.g., Green Peppers, Broccoli, Cauliflower Mix"
                    value={form.product_name} disabled={!!form.existing_product_id} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Category (Optional)</label>
                  <input type="text" name="category" className="form-input"
                    placeholder="e.g., Vegetables, Fruits, Dairy"
                    value={form.category} disabled={!!form.existing_product_id} onChange={handleChange} />
                </div>
              </div>

              <div className="form-section">
                <h3><i className="fas fa-list-alt"></i> Variation Details</h3>
                <div className="form-group">
                  <label>Variation Type *</label>
                  <select name="variation_type" className="form-select" required value={form.variation_type} onChange={handleChange}>
                    <option value="">-- Select variation type --</option>
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                    <option value="flavor">Flavor</option>
                    <option value="color">Color</option>
                    <option value="mixture">Mixture</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Variation Value *</label>
                  <input type="text" name="variation_value" className="form-input" required
                    placeholder={VARIATION_EXAMPLES[form.variation_type] || 'Enter variation value'}
                    value={form.variation_value} onChange={handleChange} />
                </div>
              </div>

              <div className="form-section">
                <h3><i className="fas fa-globe"></i> Barcode Settings</h3>
                <div className="form-group">
                  <label>Country Standard *</label>
                  <select name="barcode_country" className="form-select" required value={form.barcode_country} onChange={handleChange}>
                    {Object.entries(COUNTRY_STANDARDS).map(([code, info]) => (
                      <option key={code} value={code}>{info.country_name} ({info.standard_format} – {info.prefix})</option>
                    ))}
                  </select>
                  <p className="form-hint">Zimbabwe uses EAN-13 standard (13 digits with prefix 977)</p>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="generate_qrcode" checked={form.generate_qrcode} onChange={handleChange} />
                    <i className="fas fa-qrcode"></i> Also generate QR Code
                  </label>
                  <p className="form-hint">QR codes are scannable by smartphones</p>
                </div>
                {countryInfo && (
                  <div className="country-info-box">
                    <h4><i className="fas fa-flag"></i> {countryInfo.title}</h4>
                    <div className="standard-details">
                      {countryInfo.details.map(d => (
                        <p key={d.key}><strong>{d.key}:</strong> {d.value}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section examples">
                <h3><i className="fas fa-lightbulb"></i> Examples for Horticulture Farmers</h3>
                <div className="example-grid">
                  {[
                    { product: 'Peppers',       variation: '200g Red Pepper Pack' },
                    { product: 'Peppers',        variation: '500g Yellow Pepper Pack' },
                    { product: 'Broccoli',       variation: '200g Organic Broccoli' },
                    { product: 'Vegetable Mix',  variation: 'Broccoli/Cauliflower Mixture 400g' },
                  ].map((ex, i) => (
                    <div key={i} className="example-item">
                      <strong>Product:</strong> {ex.product}<br />
                      <strong>Variation:</strong> {ex.variation}<br />
                      <strong>Barcode:</strong> 977XXXXXXXXX✓
                    </div>
                  ))}
                </div>
                <p className="example-note">
                  <i className="fas fa-info-circle"></i> Each variation gets a unique EAN-13 barcode for supermarket inventory systems.
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
                  <i className="fas fa-barcode"></i> {submitting ? 'Generating…' : 'Generate Professional Barcode'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setForm(EMPTY_FORM); setGenerated(null); setQrDataUrl(''); setError(''); setSuccess(''); }}>
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </Layout>
  );
}
