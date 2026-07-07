import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/api';

// Fires an analytics page_view on every route change.
// All data is written to the mocked email/events outbox (no GA/FB Pixel yet).
const AnalyticsTracker = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    trackEvent({
      name: 'page_view',
      path: location.pathname + location.search,
      referrer: document.referrer || null,
      session_id: null,
    });
  }, [location.pathname, location.search]);
  return null;
};

export default AnalyticsTracker;
