import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashLayout from '../components/DashLayout';

function VariationsModal({ productId, userId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setData({ success: false }); setLoading(false); return; }
    (async () => {
      const [{ data: product }, { data: variations }] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).eq('user_id', userId).single(),
        supabase.from('variations').select('*').eq('product_id', productId).order('created_at', { ascending: true }),
      ]);
      if (!product) setData({ success: false });
      else setData({ success: true, product, variations: variations ?? [] });
      setLoading(false);
    })();
  }, [productId, userId]);

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ color: '#f0f0f0' }}>Product Variations</h2>
          <button className="close-modal" onClick={onClose} style={{ color: '#9ca3af' }}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="dp-loading"><div className="dp-spinner" /></div>
          ) : !data?.success ? (
            <div className="dp-alert dp-alert-error">Failed to load variations.</div>
          ) : (
            <>
              <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {data.product.product_name}
              </p>
              {data.variations.length > 0 ? (
                <div className="dp-table-wrap">
                  <table className="dp-table">
                    <thead>
                      <tr><th>Type</th><th>Value</th><th>Barcode</th><th>Format</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {data.variations.map(v => (
                        <tr key={v.id}>
                          <td><span className="dp-badge dp-badge-blue">{v.variation_type}</span></td>
                          <td>{v.variation_value}</td>
                          <td><code>{v.barcode_data}</code></td>
                          <td>{v.barcode_format}</td>
                          <td>{new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="dp-empty">
                  <div className="dp-empty-icon">📦</div>
                  <p>No variations yet.</p>
                  <Link to="/generate-barcode" className="dp-btn dp-btn-primary" onClick={onClose}>Add First Variation</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const { user } = useAuth();

  const [products,     setProducts]     = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [msg,          setMsg]          = useState('');
  const [err,          setErr]          = useState('');
  const [modalProduct, setModalProduct] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!supabase) { setLoading(false); return; }
    const [{ data: prods }, { data: vars }, { data: plan }] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('variations').select('product_id').eq('user_id', user.id),
      supabase.from('subscription_plans').select('*').eq('id', user.subscription_type).single(),
    ]);

    const countByProduct = (vars ?? []).reduce((acc, v) => {
      acc[v.product_id] = (acc[v.product_id] || 0) + 1;
      return acc;
    }, {});

    setProducts((prods ?? []).map(p => ({ ...p, variation_count: countByProduct[p.id] ?? 0 })));
    setSubscription(plan);
    setLoading(false);
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}" and all its variations? This cannot be undone.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', productId).eq('user_id', user.id);
    if (error) { setErr(error.message || 'Failed to delete.'); return; }
    setMsg('Product deleted.');
    loadData();
  };

  const maxProducts   = user?.enterprise_config?.max_products ?? subscription?.max_products ?? 0;
  const atLimit       = maxProducts > 0 && products.length >= maxProducts;

  const actions = (
    <Link to="/generate-barcode" className="dp-btn dp-btn-primary">
      + New Product
    </Link>
  );

  return (
    <DashLayout active="products" title="Products" actions={actions}>
      {msg && <div className="dp-alert dp-alert-success">{msg}</div>}
      {err && <div className="dp-alert dp-alert-error">{err}</div>}
      {atLimit && (
        <div className="dp-alert dp-alert-warn">
          Product limit reached for the {user.subscription_type} plan.{' '}
          <Link to="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>Upgrade</Link> to add more.
        </div>
      )}

      <div className="dp-section">
        <div className="dp-section-header">
          <div>
            <p className="dp-section-title">All Products</p>
            <p className="dp-section-sub">{products.length} product{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : products.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">📦</div>
            <p>No products yet. Create your first product to get started.</p>
            <Link to="/generate-barcode" className="dp-btn dp-btn-primary">Create First Product</Link>
          </div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Product Name</th><th>Category</th><th>Variations</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{p.product_name}</td>
                    <td>{p.category || <span style={{ color: '#4b5563' }}>—</span>}</td>
                    <td><span className="dp-badge dp-badge-blue">{p.variation_count} var{p.variation_count !== 1 ? 's' : ''}</span></td>
                    <td>{new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div className="dp-row-actions">
                        <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={() => setModalProduct(p.id)}>
                          View
                        </button>
                        <Link to="/generate-barcode" className="dp-btn dp-btn-ghost dp-btn-sm">
                          + Add
                        </Link>
                        <button
                          className="dp-btn dp-btn-danger dp-btn-sm"
                          onClick={() => handleDelete(p.id, p.product_name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalProduct && (
        <VariationsModal productId={modalProduct} userId={user.id} onClose={() => setModalProduct(null)} />
      )}
    </DashLayout>
  );
}
