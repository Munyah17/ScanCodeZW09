import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <div className="container">
        {children}
      </div>
      <Footer />
      <ChatWidget />
    </>
  );
}
