import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AnnouncementBar from './components/AnnouncementBar';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="App">
      <CartProvider>
        <BrowserRouter>
          <AnnouncementBar />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:categorySlug" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
          <Footer />
          <CartDrawer />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </CartProvider>
    </div>
  );
}

export default App;
