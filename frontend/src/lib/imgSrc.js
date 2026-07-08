// Image helper — turns a source URL into responsive attrs for <img>.
// Handles: Unsplash (adds w= param), our own /api/images/… (as-is, already WebP), and everything else (as-is).

const isUnsplash = (u) => typeof u === 'string' && u.includes('images.unsplash.com');
const isOurCdn = (u) => typeof u === 'string' && u.startsWith('/api/images/');

const unsplashAt = (u, w) => {
  try {
    const url = new URL(u);
    url.searchParams.set('w', String(w));
    url.searchParams.set('auto', 'format,compress');
    url.searchParams.set('q', '80');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  } catch {
    return u;
  }
};

/**
 * Returns responsive image props for <img>.
 * @param {string} src - raw image URL
 * @param {object} opts
 * @param {number} opts.width - intrinsic width in px (target 1x)
 * @param {number} opts.height - intrinsic height in px
 * @param {boolean} opts.eager - if true, disables lazy-load (use for above-the-fold hero)
 * @param {string} opts.sizes - the CSS `sizes` attribute
 */
export const imgProps = (src, opts = {}) => {
  const { width = 800, height, eager = false, sizes = '(max-width: 768px) 100vw, 33vw' } = opts;
  const base = { loading: eager ? 'eager' : 'lazy', decoding: 'async' };
  if (!src) return base;

  if (isUnsplash(src)) {
    return {
      ...base,
      src: unsplashAt(src, width),
      srcSet: [400, 800, 1200, 1600].map(w => `${unsplashAt(src, w)} ${w}w`).join(', '),
      sizes,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };
  }
  // Our CDN images are already WebP + resized to 1600 max; browser scales down naturally.
  if (isOurCdn(src)) {
    return { ...base, src, ...(width ? { width } : {}), ...(height ? { height } : {}) };
  }
  return { ...base, src, ...(width ? { width } : {}), ...(height ? { height } : {}) };
};

/** Preload link for above-the-fold hero images (drop in <head> via react-helmet). */
export const preloadHref = (src, width = 1600) => (isUnsplash(src) ? unsplashAt(src, width) : src);
