import React from 'react';
import { LogIn, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Logo from '../components/Logo';

const AdminLogin = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/admin" replace />;

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/admin/callback';
    const authBase = process.env.REACT_APP_AUTH_URL || 'https://auth.emergentagent.com/';
    window.location.href = `${authBase}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF3EB] to-[#F5D0CE]/40 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#EBD9CE] shadow-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FDF3EB] flex items-center justify-center mx-auto mb-6 border border-[#EBD9CE]">
          <Shield className="w-7 h-7 text-[#B4593F]" />
        </div>
        <Logo variant="dark" className="h-8 mx-auto mb-2" />
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#B4593F]">Admin Portal</div>
        <h1 className="font-serif-display text-3xl mt-6">Welcome back</h1>
        <p className="text-sm text-neutral-600 mt-2">Sign in with your authorised Google account to manage the storefront.</p>
        <button onClick={handleLogin} className="mt-8 w-full inline-flex items-center justify-center gap-3 bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white px-6 py-4 rounded-full text-xs uppercase tracking-[0.2em]">
          <LogIn className="w-4 h-4" /> Continue with Google
        </button>
        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
          <Sparkles className="w-3 h-3 text-[#B4593F]" /> Secured Sign-In
        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
