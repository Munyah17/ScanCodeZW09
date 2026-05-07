import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import Alert from '../components/Alert';

export default function Dashboard() {
  const { user } = useAuth();

  const [subscription,   setSubscription]   = useState(null);
  const [productCount,   setProductCount]   = useState(0);
  const [barcodeCount,   setBarcodeCount]   = useState(0);
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentBarcodes, setRecentBarcodes] = useState([]);
  const [apiKeys,        setApiKeys]        = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!supabase || !user) { setLoading(false); return; }

    try {
      const [
        { count: pc },
        { count: bc },
        { data: rp },
        { data: rb },
        { data: plan },
        { data: keys },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('variations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('products')
          .select('id, product_name, category, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('variations')
          .select('id, barcode_data, barcode_format, created_at, products(product_name), variation_value')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('subscription_plans')
          .select('id, name, price_usd, max_products, max_variations_per_product, features')
          .eq('id', user.subscription_type)
          .single(),
        supabase.from('api_keys')
          .select('id, name, key_prefix, scopes, active, last_used_at, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setProductCount(pc ?? 0);
      setBarcodeCount(bc ?? 0);
      setRecentProducts(rp ?? []);
      setRecentBarcodes(rb ?? []);
      setApiKeys(keys ?? []);

      // For enterprise/custom plans, merge in enterprise_config overrides
      if (plan && user.enterprise_config) {
        setSubscription({
          ...plan,
          max_products:               user.enterprise_config.max_products               ?? plan.max_products,
          max_variations_per_product: user.enterprise_config.max_variations_per_product ?? plan.max_variations_per_product,
          features:                   user.enterprise_config.features                   ?? plan.features,
          name:                       user.enterprise_config.name                       ?? plan.name,
        });
      } else {
        setSubscription(plan);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!supabase) return;
    await supabase.from('api_keys').update({ active: false }).eq('id', keyId);
    setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, active: false } : k));
  };

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;

  const usagePct     = subscription?.max_products ? Math.min(100, (productCount / subscription.max_products) * 100) : 0;
  const planExpiry   = user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No expiry';
  const planName     = user.subscription_type ? user.subscription_type.charAt(0).toUpperCase() + user.subscription_type.slice(1) : 'Starter';

  return (
    <Layout>
      <main className="dashboard">
        <Sidebar activeItem="dashboard" productCount={productCount} barcodeCount={barcodeCount} subscription={subscription} />

        <div className="main-content">
          <div className="dashboard-header">
            <h1>Welcome back, {user.username}!</h1>
            <p>Here's what's happening with your barcodes today.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#4f46e5' }}><i className="fas fa-box"></i></div>
              <div className="stat-info"><h3>{productCount}</h3><p>Total Products</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#10b981' }}><i className="fas fa-barcode"></i></div>
              <div className="stat-info"><h3>{barcodeCount}</h3><p>Barcodes Generated</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}><i className="fas fa-crown"></i></div>
              <div className="stat-info"><h3>{planName}</h3><p>Current Plan</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ef4444' }}><i className="fas fa-calendar-alt"></i></div>
              <div className="stat-info"><h3>{planExpiry}</h3><p>Plan Renewal</p></div>
            </div>
          </div>

          {/* Recent Products */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Products</h2>
              <Link to="/products" className="btn btn-outline btn-sm">View All</Link>
            </div>
            {recentProducts.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Product Name</th><th>Category</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {recentProducts.map(p => (
                      <tr key={p.id}>
                        <td>{p.product_name}</td>
                        <td>{p.category || 'Uncategorized'}</td>
                        <td>{new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <Link to="/generate-barcode" className="btn-action btn-sm">
                            <i className="fas fa-plus"></i> Add Variation
                          </Link>
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
                <p>Start by creating your first product and barcode.</p>
                <Link to="/generate-barcode" className="btn btn-primary">Create First Product</Link>
              </div>
            )}
          </div>

          {/* Recent Barcodes */}
          <div className="dashboard-section">
            <div className="section-header"><h2>Recent Barcodes</h2></div>
            {recentBarcodes.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Product</th><th>Variation</th><th>Barcode</th><th>Format</th><th>Created</th></tr>
                  </thead>
                  <tbody>
                    {recentBarcodes.map(b => (
                      <tr key={b.id}>
                        <td>{b.products?.product_name ?? '—'}</td>
                        <td>{b.variation_value}</td>
                        <td><code>{b.barcode_data}</code></td>
                        <td>{b.barcode_format}</td>
                        <td>{new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-barcode"></i>
                <h3>No barcodes yet</h3>
                <p>Generate your first barcode to see it here.</p>
                <Link to="/generate-barcode" className="btn btn-primary">Generate Barcode</Link>
              </div>
            )}
          </div>

          {/* Subscription */}
          {subscription && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Your Subscription: {subscription.name ?? planName} Plan</h2>
                <Link to="/pricing" className="btn btn-outline btn-sm">Upgrade</Link>
              </div>
              <div className="subscription-details">
                <div className="subscription-info">
                  {subscription.price_usd && <p><strong>Price:</strong> ${subscription.price_usd} / month</p>}
                  <p><strong>Product Limit:</strong> {subscription.max_products ?? 'Unlimited'} products</p>
                  <p><strong>Variations per Product:</strong> {subscription.max_variations_per_product ?? 'Unlimited'}</p>
                  {subscription.features && <p><strong>Features:</strong> {subscription.features}</p>}
                  {user.admin_notes && <p style={{ color: '#6b7280', fontStyle: 'italic' }}><strong>Note:</strong> {user.admin_notes}</p>}
                </div>
                {subscription.max_products && productCount >= subscription.max_products && (
                  <Alert type="warning" message="You've reached your product limit. Upgrade your plan to add more products." />
                )}
                {subscription.max_products && productCount >= subscription.max_products * 0.8 && productCount < subscription.max_products && (
                  <Alert type="info" message={`You're using ${Math.round(usagePct)}% of your product limit.`} />
                )}
              </div>
            </div>
          )}

          {/* API Keys */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2><i className="fas fa-key"></i> API Keys</h2>
            </div>
            {apiKeys.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <i className="fas fa-key"></i>
                <h3>No API keys yet</h3>
                <p>Generate an API key to connect your POS system or other applications.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Key Prefix</th><th>Scopes</th><th>Last Used</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {apiKeys.map(k => (
                      <tr key={k.id}>
                        <td><strong>{k.name}</strong></td>
                        <td><code>{k.key_prefix}…</code></td>
                        <td>{(k.scopes ?? []).join(', ') || 'None'}</td>
                        <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-GB') : 'Never'}</td>
                        <td><span className={`badge ${k.active ? 'badge-success' : 'badge-danger'}`}>{k.active ? 'Active' : 'Revoked'}</span></td>
                        <td>
                          {k.active && (
                            <button className="btn-action btn-sm" style={{ color: '#ef4444' }} onClick={() => handleRevokeKey(k.id)}>
                              <i className="fas fa-ban"></i> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
              <i className="fas fa-info-circle"></i> To generate a new API key, contact support or use the API Keys section in your settings.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
