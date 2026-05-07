import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const FEATURES = [
  { icon: 'fas fa-barcode',    title: 'Multiple Product Variations', desc: 'Generate unique barcodes for weight, volume, flavor, color, and packaging variations.' },
  { icon: 'fas fa-chart-line', title: 'Easy Management',            desc: 'Simple dashboard to organise products and track your barcode inventory.' },
  { icon: 'fas fa-shield-alt', title: 'Secure & Reliable',          desc: 'Your data is safe with our secure platform and regular backups.' },
  { icon: 'fas fa-mobile-alt', title: 'Mobile Friendly',            desc: 'Access your dashboard and generate barcodes from any device.' },
];

const PLANS = [
  { name: 'Starter',  price: '1.59',  popular: false, features: ['Up to 3 products', '3 variations per product', 'EAN-13 & UPC-A formats', 'QR code generation', 'PNG & PDF downloads', 'Email support'] },
  { name: 'Business', price: '4.99',  popular: true,  features: ['Up to 20 products', '15 variations per product', 'All barcode formats', 'Custom branding', 'Priority email support', 'Advanced exports'] },
  { name: 'Pro',      price: '11.99', popular: false, features: ['Up to 100 products', '50 variations per product', 'All barcode formats', '24/7 phone & email support', 'API access', 'Advanced analytics'] },
];

export default function Landing() {
  return (
    <Layout>
      <main className="landing-page">
        <section className="hero">
          <div className="hero-content">
            <h1>Generate Professional Barcodes for Your Products</h1>
            <p className="subtitle">Create unique EAN-13 barcodes for every product variation. Perfect for farmers, retailers, and manufacturers in Zimbabwe and beyond.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
              <a href="#features" className="btn btn-secondary btn-lg">Learn More</a>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Barcode scanning"
            />
          </div>
        </section>

        <section id="features" className="features-section">
          <h2>Why Choose ScanCodeZW?</h2>
          <p className="section-subtitle">Everything you need to manage product barcodes professionally</p>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon"><i className={f.icon}></i></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="pricing-section">
          <h2>Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Choose the plan that fits your business needs</p>
          <div className="pricing-grid">
            {PLANS.map(plan => (
              <div key={plan.name} className={`pricing-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <div className="price">${plan.price}<span>/month</span></div>
                </div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}><i className="fas fa-check"></i> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'} btn-block`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise teaser */}
          <div className="enterprise-teaser">
            <div className="enterprise-teaser-content">
              <i className="fas fa-building"></i>
              <div>
                <h3>Enterprise</h3>
                <p>Unlimited products, white-label branding, full API access, on-premise deployment, and a dedicated account manager. Pricing is scoped to your requirements.</p>
              </div>
            </div>
            <Link to="/pricing#enterprise" className="btn btn-outline">Contact Enterprise Sales</Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/pricing" className="btn btn-secondary">View Full Plan Comparison</Link>
          </div>
        </section>

        <section className="use-case-section">
          <h2>Perfect for Horticulture Farmers</h2>
          <div className="use-case-example">
            <div className="use-case-image">
              <img
                src="https://images.unsplash.com/photo-1597362925123-77861d3fbac7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Fresh vegetables"
              />
            </div>
            <div className="use-case-content">
              <h3>Example: Pepper Supplier</h3>
              <p>Generate unique EAN-13 barcodes for each variation:</p>
              <ul>
                <li><strong>Product:</strong> Peppers</li>
                <li><strong>Variations:</strong>
                  <ul>
                    <li>200g Green Pepper Pack</li>
                    <li>200g Red Pepper Pack</li>
                    <li>500g Green Pepper Pack</li>
                    <li>500g Red Pepper Pack</li>
                  </ul>
                </li>
              </ul>
              <p>Each variation gets a unique, scannable barcode for supermarket inventory systems.</p>
              <Link to="/register" className="btn btn-primary">Start Generating Barcodes</Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
