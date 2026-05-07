import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import Alert from '../components/Alert';

function VariationsModal({ productId, userId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setData({ success: false }); setLoading(false); return; }
    async function load() {
      const [{ data: product }, { data: variations }] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).eq('user_id', userId).single(),
        supabase.from('variations').select('*').eq('product_id', productId).order('created_at', { ascending: true }),
      ]);
      if (!product) setData({ success: false });
      else setData({ success: true, product, variations: variations ?? [] });
      setLoading(false);
    }
    load();
  }, [productId, userId]);

  return (
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Product Variations</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>
          ) : !data?.success ? (
            <Alert type="error" message="Failed to load variations." />
          ) : (
            <>
              <h3 style={{ marginBottom: '1rem' }}>Variations for: {data.product.product_name}</h3>
              {data.variations.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr><th>Type</th><th>Value</th><th>Barcode</th><th>Format</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {data.variations.map(v => (
                        <tr key={v.id}>
                          <td><span className="badge">{v.variation_type}</span></td>
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
                <div className="empty-state">
                  <i className="fas fa-list-alt"></i>
                  <p>No variations found for this product.</p>
                  <Link to="/generate-barcode" className="btn btn-primary" onClick={onClose}>Add First Variation</Link>
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
  const [productCount, setProductCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState('');
  const [error,        setError]        = useState('');
  const [modalProduct, setModalProduct] = useState(null);

  useEffect(() => { loadData(); }, []);

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

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}" and all its variations? This cannot be undone.`)) return;
    const { error: deleteErr } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', user.id);
    if (deleteErr) { setError(deleteErr.message || 'Failed to delete product.'); return; }
    setMessage('Product deleted successfully.');
    await loadData();
  };

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;

  const maxProducts = user?.enterprise_config?.max_products ?? subscription?.max_products ?? 0;

  return (
    <Layout>
      <main className="dashboard">
        <Sidebar activeItem="products" productCount={productCount} subscription={subscription} />

        <div className="main-content">
          <div className="dashboard-header">
            <h1>My Products</h1>
            <p>Manage your products and their barcode variations</p>
          </div>

          {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}
          {error   && <Alert type="error"   message={error}   onClose={() => setError('')} />}

          <div className="section-header">
            <h2>All Products ({productCount})</h2>
            <Link to="/generate-barcode" className="btn btn-primary">
              <i className="fas fa-plus"></i> Add New Product
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Product Name</th><th>Category</th><th>Variations</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.product_name}</strong></td>
                      <td>{p.category || 'Uncategorized'}</td>
                      <td><span className="badge">{p.variation_count} variations</span></td>
                      <td>{new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <div className="action-buttons">
                          <Link to="/generate-barcode" className="btn-action btn-sm">
                            <i className="fas fa-plus"></i> Add Variation
                          </Link>
                          <button className="btn-action btn-sm btn-view" onClick={() => setModalProduct(p.id)}>
                            <i className="fas fa-eye"></i> View
                          </button>
                          <button
                            className="btn-action btn-sm"
                            style={{ color: '#dc2626', background: '#fee2e2' }}
                            onClick={() => handleDelete(p.id, p.product_name)}
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-box-open"></i>
              <h3>No products yet</h3>
              <p>You haven't created any products yet.</p>
              <Link to="/generate-barcode" className="btn btn-primary">Create First Product</Link>
            </div>
          )}

          {subscription && productCount >= maxProducts && (
            <Alert type="warning" message={`You've reached your product limit for the ${user.subscription_type} plan.`} />
          )}
        </div>
      </main>

      {modalProduct && (
        <VariationsModal productId={modalProduct} userId={user.id} onClose={() => setModalProduct(null)} />
      )}
    </Layout>
  );
}
