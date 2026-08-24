/**
 * Detect in-app / embedded browsers (Instagram, Facebook, Threads, LinkedIn,
 * Twitter, Snapchat, Line, WeChat, KakaoTalk). These WebViews are far more
 * fragile than Safari/Chrome — programmatic scroll-restoration overrides,
 * autoplaying audio and other DOM tricks tend to freeze the page. We use this
 * flag to disable the aggressive scroll-reset that was previously firing on
 * every route change (it caused the site to appear frozen on the About
 * section inside the Instagram WebView).
 */
export const isInAppBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return (
    /instagram|fban|fbav|fb_iab|threads|linkedinapp|twitter|snapchat|line\//i.test(ua)
    || /micromessenger|kakaotalk|whatsapp|wv\)/.test(ua)
  );
};

export default isInAppBrowser;
