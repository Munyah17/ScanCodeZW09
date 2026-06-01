import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-inner">
      <div className="footer-container">
        <div className="footer-section">
          <div className="logo" style={{ marginBottom: '1rem' }}>
            <i className="fas fa-barcode"></i>
            <span>ScanCodeZW</span>
          </div>
          <p>Professional barcode generation for businesses of all sizes.</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook"></i></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Product</h4>
          <ul>
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/pricing">Use Cases</Link></li>
            <li><span style={{ color: '#94a3b8' }}>Updates</span></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Company</h4>
          <ul>
            <li><span style={{ color: '#94a3b8' }}>About</span></li>
            <li><span style={{ color: '#94a3b8' }}>Blog</span></li>
            <li><span style={{ color: '#94a3b8' }}>Careers</span></li>
            <li><span style={{ color: '#94a3b8' }}>Press</span></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><Link to="/pricing">Help Center</Link></li>
            <li><a href="mailto:support@scancodezw.co.zw">Contact Us</a></li>
            <li><span style={{ color: '#94a3b8' }}>Privacy Policy</span></li>
            <li><span style={{ color: '#94a3b8' }}>Terms of Service</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} ScanCodeZW. All rights reserved.</p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.6 }}>Built by <a href="https://wa.me/263773909307" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Global Space Web Technology</a></p>
      </div>
      </div>
    </footer>
  );
}
