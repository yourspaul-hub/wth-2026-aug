import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AnnouncementBar from './components/AnnouncementBar';
import RedirectGate from './components/RedirectGate';
import SeoHelmet from './components/SeoHelmet';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import AdminLogin from './pages/AdminLogin';
import AuthCallback from './components/AuthCallback';
import ProtectedAdmin from './components/ProtectedAdmin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminCollections from './pages/admin/Collections';
import AdminCoupons from './pages/admin/Coupons';
import AdminShipping from './pages/admin/Shipping';
import AdminTax from './pages/admin/Tax';
import AdminReviews from './pages/admin/Reviews';
import AdminSeo from './pages/admin/Seo';
import AdminRedirects from './pages/admin/Redirects';
import AdminNewsletter from './pages/admin/Newsletter';
import AdminEmails from './pages/admin/Emails';
import AdminAbandonedCarts from './pages/admin/AbandonedCarts';
import { Toaster } from './components/ui/sonner';

// Storefront chrome (navbar, footer, cart, announcement) — hidden on /admin routes and /admin/callback
function AppRouter() {
  const location = useLocation();

  // Handle Emergent Auth callback with #session_id — process before normal routing
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <RedirectGate />
      {!isAdmin && <AnnouncementBar />}
      {!isAdmin && <Navbar />}
      {!isAdmin && <SeoHelmet />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:categorySlug" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:orderNumber" element={<OrderSuccess />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/callback" element={<AuthCallback />} />
        <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="shipping" element={<AdminShipping />} />
          <Route path="tax" element={<AdminTax />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="seo" element={<AdminSeo />} />
          <Route path="redirects" element={<AdminRedirects />} />
          <Route path="newsletter" element={<AdminNewsletter />} />
          <Route path="emails" element={<AdminEmails />} />
          <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
        </Route>
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
      <Toaster position="top-center" richColors />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;
