import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authSession } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const sid = params.get('session_id');
    if (!sid) { nav('/admin/login'); return; }
    (async () => {
      try {
        const user = await authSession(sid);
        setUser(user);
        // strip hash and go to admin
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        nav('/admin', { replace: true, state: { user } });
      } catch (e) {
        nav('/admin/login', { replace: true });
      }
    })();
  }, [location.hash, nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF3EB]">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-[#B4593F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="font-serif-display text-2xl">Signing you in...</div>
      </div>
    </div>
  );
};

export default AuthCallback;
