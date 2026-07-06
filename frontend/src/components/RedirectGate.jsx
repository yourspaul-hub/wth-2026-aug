import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listRedirects } from '../lib/api';

let cache = null;

const RedirectGate = () => {
  const location = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      if (!cache) {
        try { cache = await listRedirects(); } catch { cache = []; }
      }
      const match = cache.find(r => r.from_path === location.pathname && r.active);
      if (match) nav(match.to_path, { replace: true });
    })();
  }, [location.pathname, nav]);
  return null;
};

export default RedirectGate;
