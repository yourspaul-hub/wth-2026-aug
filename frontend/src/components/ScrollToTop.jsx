import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll the window to the top on every route change.
 * Skips scroll restoration when navigating with an explicit hash (#section)
 * so anchor links still land where they should.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    // Instant scroll (not smooth) to feel like a fresh page load.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
};

export default ScrollToTop;
