import React from 'react';
import './App.css';
import './lib/i18n';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AnnouncementBar from './components/AnnouncementBar';
import RedirectGate from './components/RedirectGate';
import SeoHelmet from './components/SeoHelmet';
import AnalyticsTracker from './components/AnalyticsTracker';
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
import AdminLocations from './pages/admin/Locations';
import AdminBlog from './pages/admin/Blog';
import AdminInstagram from './pages/admin/Instagram';
import AdminAnalytics from './pages/admin/Analytics';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import QrReviewSubmit from './pages/QrReviewSubmit';
import PublicReviewSubmit from './pages/PublicReviewSubmit';
import AdminCategories from './pages/admin/Categories';
import AdminUsers from './pages/admin/Users';
import AdminIntegrations from './pages/admin/Integrations';
import AdminDesign from './pages/admin/Design';
import AdminHeroSlides from './pages/admin/HeroSlides';
import AdminLightbox from './pages/admin/Lightbox';
import AdminPartnerships from './pages/admin/Partnerships';
import AdminResetData from './pages/admin/ResetData';
import Wishlist from './pages/Wishlist';
import MusicWidget from './components/MusicWidget';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { ContentProvider } from './context/ContentContext';
import { Toaster } from './components/ui/sonner';

// Storefront chrome (navbar, footer, cart, announcement) — hidden on /admin routes and /admin/callback
function AppRouter() {
  const location = useLocation();

  // Handle OAuth callback with #session_id — process before normal routing
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <RedirectGate />
      <ScrollToTop />
      <AnalyticsTracker />
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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/r/:token" element={<QrReviewSubmit />} />
        <Route path="/review" element={<PublicReviewSubmit />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:orderNumber" element={<OrderSuccess />} />
        <Route path="/wishlist" element={<Wishlist />} />

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
          <Route path="locations" element={<AdminLocations />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="instagram" element={<AdminInstagram />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="design" element={<AdminDesign />} />
          <Route path="hero-slides" element={<AdminHeroSlides />} />
          <Route path="lightbox" element={<AdminLightbox />} />
          <Route path="partnerships" element={<AdminPartnerships />} />
          <Route path="reset-data" element={<AdminResetData />} />
        </Route>
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <MusicWidget />}
      <Toaster position="top-center" richColors />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <HelmetProvider>
          <AuthProvider>
            <CurrencyProvider>
              <ContentProvider>
                <CartProvider>
                  <BrowserRouter>
                    <AppRouter />
                  </BrowserRouter>
                </CartProvider>
              </ContentProvider>
            </CurrencyProvider>
          </AuthProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
