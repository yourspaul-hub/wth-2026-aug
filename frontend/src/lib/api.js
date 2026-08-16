import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Fail loudly in the browser console when the env var is missing on the deploy
// target (a common cause of "flash then blank" in Vercel/Netlify builds).
if (!BACKEND_URL && typeof window !== 'undefined') {
  console.error(
    '[api] REACT_APP_BACKEND_URL is not set. Configure it in your deployment ' +
    'platform (Vercel → Settings → Environment Variables) and redeploy.'
  );
}

export const API_BASE = `${BACKEND_URL || ''}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Public endpoints
export const fetchCategories = () => api.get('/categories').then(r => r.data);
export const fetchProducts = (params = {}) => api.get('/products', { params }).then(r => r.data);
export const fetchProduct = (id) => api.get(`/products/${id}`).then(r => r.data);
export const fetchRecommendations = (id, limit = 8) => api.get(`/products/${id}/recommendations`, { params: { limit } }).then(r => r.data);
export const fetchCurrencyRates = () => api.get('/currency/rates').then(r => r.data);
export const fetchSiteContent = () => api.get('/content').then(r => r.data);
export const adminSaveSiteContent = (updates) => api.put('/admin/content', { updates }).then(r => r.data);
export const adminResetSiteContentKey = (key) => api.delete(`/admin/content/${encodeURIComponent(key)}`).then(r => r.data);
export const fetchPublicSettings = () => api.get('/settings/public').then(r => r.data);
export const adminUploadCatalogue = (file, onProgress) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/admin/catalogue', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); },
  }).then(r => r.data);
};
export const adminDeleteCatalogue = () => api.delete('/admin/catalogue').then(r => r.data);
export const fetchReviews = () => api.get('/reviews').then(r => r.data?.items || r.data || []);
export const fetchReviewsFull = (params = {}) => api.get('/reviews', { params }).then(r => r.data);
export const validateCoupon = (code, subtotal) => api.post('/coupons/validate', { code, subtotal }).then(r => r.data);
export const createOrder = (payload) => api.post('/orders', payload).then(r => r.data);
export const verifyPayment = (payload) => api.post('/payments/razorpay/verify', payload).then(r => r.data);
export const getOrder = (orderNumber) => api.get(`/orders/${orderNumber}`).then(r => r.data);
export const shippingRates = (pincode, weight) => api.post('/shipping/rates', { pincode, weight }).then(r => r.data);
export const trackShipment = (awb) => api.get(`/shipping/track/${awb}`).then(r => r.data);
export const subscribeNewsletter = (email) => api.post('/newsletter/subscribe', { email }).then(r => r.data);
export const getSeoMeta = (path) => api.get('/seo/meta', { params: { path } }).then(r => r.data);
export const listRedirects = () => api.get('/redirects').then(r => r.data);

// Auth
export const authSession = (session_id) => api.post('/auth/session', { session_id }).then(r => r.data);
export const authMe = () => api.get('/auth/me').then(r => r.data);
export const authLogout = () => api.post('/auth/logout').then(r => r.data);

// Admin
export const adminStats = () => api.get('/admin/stats').then(r => r.data);
export const adminListOrders = (status) => api.get('/admin/orders', { params: status ? { status } : {} }).then(r => r.data);
export const adminUpdateOrder = (orderNumber, patch) => api.patch(`/admin/orders/${orderNumber}`, patch).then(r => r.data);
export const adminFulfillOrder = (orderNumber, payload) => api.post(`/admin/orders/${orderNumber}/fulfill`, payload).then(r => r.data);
export const adminListCouriers = () => api.get('/admin/couriers').then(r => r.data?.items || []);
export const adminImportPastOrders = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/admin/orders/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const pastOrdersTemplateUrl = () => `${API_BASE}/admin/orders/import-template.csv`;
export const adminListResetTargets = () => api.get('/admin/dev/reset/targets').then(r => r.data?.items || []);
export const adminResetData = (targets, confirm) => api.post('/admin/dev/reset', { targets, confirm }).then(r => r.data);

export const adminUploadImageFile = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/admin/images/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const adminUploadImageFromUrl = (url) => api.post('/admin/images/upload-from-url', { url }).then(r => r.data);

// --- Hero slides ---
export const fetchHeroSlides = () => api.get('/hero-slides').then(r => r.data?.items || []);
export const adminListHeroSlides = () => api.get('/admin/hero-slides').then(r => r.data?.items || []);
export const adminCreateHeroSlide = (payload) => api.post('/admin/hero-slides', payload).then(r => r.data);
export const adminUpdateHeroSlide = (id, patch) => api.patch(`/admin/hero-slides/${id}`, patch).then(r => r.data);
export const adminDeleteHeroSlide = (id) => api.delete(`/admin/hero-slides/${id}`).then(r => r.data);
export const adminReorderHeroSlides = (ids) => api.post('/admin/hero-slides/reorder', { ids }).then(r => r.data);

// --- Lightbox (homepage promotional modal) ---
export const adminGetLightbox = () => api.get('/admin/lightbox').then(r => r.data);
export const adminUpdateLightbox = (patch) => api.put('/admin/lightbox', patch).then(r => r.data);

// --- Partnerships (About page "Business is ministry") ---
export const fetchPartnerships = () => api.get('/partnerships').then(r => r.data?.items || []);
export const adminListPartnerships = () => api.get('/admin/partnerships').then(r => r.data?.items || []);
export const adminCreatePartnership = (payload) => api.post('/admin/partnerships', payload).then(r => r.data);
export const adminUpdatePartnership = (id, patch) => api.patch(`/admin/partnerships/${id}`, patch).then(r => r.data);
export const adminDeletePartnership = (id) => api.delete(`/admin/partnerships/${id}`).then(r => r.data);
export const adminReorderPartnerships = (ids) => api.post('/admin/partnerships/reorder', { ids }).then(r => r.data);

// --- Instagram provider settings ---
export const adminGetInstagramSettings = () => api.get('/admin/instagram-settings').then(r => r.data);
export const adminUpdateInstagramSettings = (patch) => api.put('/admin/instagram-settings', patch).then(r => r.data);

export const adminListProducts = () => api.get('/products', { params: { limit: 500 } }).then(r => r.data.items);
export const adminCreateProduct = (payload) => api.post('/admin/products', payload).then(r => r.data);
export const adminUpdateProduct = (id, patch) => api.patch(`/admin/products/${id}`, patch).then(r => r.data);
export const adminDeleteProduct = (id) => api.delete(`/admin/products/${id}`).then(r => r.data);

export const adminListCoupons = () => api.get('/admin/coupons').then(r => r.data);
export const adminCreateCoupon = (payload) => api.post('/admin/coupons', payload).then(r => r.data);
export const adminUpdateCoupon = (id, patch) => api.patch(`/admin/coupons/${id}`, patch).then(r => r.data);
export const adminDeleteCoupon = (id) => api.delete(`/admin/coupons/${id}`).then(r => r.data);

export const adminListReviews = () => api.get('/reviews', { params: { published: false } }).then(r => r.data?.items || r.data || []);
export const adminCreateReview = (payload) => api.post('/admin/reviews', payload).then(r => r.data);
export const adminUpdateReview = (id, patch) => api.patch(`/admin/reviews/${id}`, patch).then(r => r.data);
export const adminDeleteReview = (id) => api.delete(`/admin/reviews/${id}`).then(r => r.data);

export const adminListSeo = () => api.get('/admin/seo').then(r => r.data);
export const adminCreateSeo = (payload) => api.post('/admin/seo', payload).then(r => r.data);
export const adminUpdateSeo = (id, patch) => api.patch(`/admin/seo/${id}`, patch).then(r => r.data);
export const adminDeleteSeo = (id) => api.delete(`/admin/seo/${id}`).then(r => r.data);

export const adminListRedirects = () => api.get('/admin/redirects').then(r => r.data);
export const adminCreateRedirect = (payload) => api.post('/admin/redirects', payload).then(r => r.data);
export const adminUpdateRedirect = (id, patch) => api.patch(`/admin/redirects/${id}`, patch).then(r => r.data);
export const adminDeleteRedirect = (id) => api.delete(`/admin/redirects/${id}`).then(r => r.data);

export const adminNewsletter = () => api.get('/admin/newsletter').then(r => r.data);

export const adminListCategories = () => api.get('/categories').then(r => r.data);

// Collections
export const fetchCollections = (featured) => api.get('/collections', { params: featured !== undefined ? { featured } : {} }).then(r => r.data);
export const fetchCollection = (slug) => api.get(`/collections/${slug}`).then(r => r.data);
export const adminListCollections = () => api.get('/admin/collections').then(r => r.data);
export const adminCreateCollection = (payload) => api.post('/admin/collections', payload).then(r => r.data);
export const adminUpdateCollection = (id, patch) => api.patch(`/admin/collections/${id}`, patch).then(r => r.data);
export const adminDeleteCollection = (id) => api.delete(`/admin/collections/${id}`).then(r => r.data);

// Shipping rules & Tax rates
export const fetchShippingOptions = (params = {}) => api.get('/shipping/options', { params }).then(r => r.data);
export const fetchTaxRates = () => api.get('/tax/rates').then(r => r.data);
export const adminListShippingRules = () => api.get('/admin/shipping-rules').then(r => r.data);
export const adminCreateShippingRule = (p) => api.post('/admin/shipping-rules', p).then(r => r.data);
export const adminUpdateShippingRule = (id, p) => api.patch(`/admin/shipping-rules/${id}`, p).then(r => r.data);
export const adminDeleteShippingRule = (id) => api.delete(`/admin/shipping-rules/${id}`).then(r => r.data);
export const adminListTaxRates = () => api.get('/admin/tax-rates').then(r => r.data);
export const adminCreateTaxRate = (p) => api.post('/admin/tax-rates', p).then(r => r.data);
export const adminUpdateTaxRate = (id, p) => api.patch(`/admin/tax-rates/${id}`, p).then(r => r.data);
export const adminDeleteTaxRate = (id) => api.delete(`/admin/tax-rates/${id}`).then(r => r.data);

// Phase C — refunds, invoices, emails, abandoned carts
export const refundOrder = (orderNumber, reason) => api.post(`/admin/orders/${orderNumber}/refund`, { reason }).then(r => r.data);
export const invoiceUrl = (orderNumber) => `${API_BASE}/invoices/${orderNumber}`;
export const adminListEmails = (template) => api.get('/admin/emails', { params: template ? { template } : {} }).then(r => r.data);
export const adminGetEmail = (id) => api.get(`/admin/emails/${id}`).then(r => r.data);
export const trackCart = (payload) => api.post('/cart/track', payload).then(r => r.data);
export const adminListAbandonedCarts = () => api.get('/admin/abandoned-carts').then(r => r.data);
export const adminSendRecovery = (id) => api.post(`/admin/abandoned-carts/${id}/send-recovery`).then(r => r.data);

// Locations (Contact / Stores)
export const listLocations = () => api.get('/locations').then(r => r.data);
export const adminListLocations = () => api.get('/admin/locations').then(r => r.data);
export const adminCreateLocation = (p) => api.post('/admin/locations', p).then(r => r.data);
export const adminUpdateLocation = (id, p) => api.patch(`/admin/locations/${id}`, p).then(r => r.data);
export const adminDeleteLocation = (id) => api.delete(`/admin/locations/${id}`).then(r => r.data);

// Bulk product upload
export const productTemplateUrl = () => `${API_BASE}/admin/products/template.csv`;
export const adminBulkUploadProducts = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/admin/products/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const adminImportFromSheet = (url) => api.post('/admin/products/import-sheet', { url }).then(r => r.data);

// Blog
export const listBlogPosts = (params) => api.get('/blog', { params }).then(r => r.data);
export const getBlogPost = (slug) => api.get(`/blog/${slug}`).then(r => r.data);
export const adminListBlog = () => api.get('/admin/blog').then(r => r.data);
export const adminCreateBlog = (p) => api.post('/admin/blog', p).then(r => r.data);
export const adminUpdateBlog = (id, p) => api.patch(`/admin/blog/${id}`, p).then(r => r.data);
export const adminDeleteBlog = (id) => api.delete(`/admin/blog/${id}`).then(r => r.data);

// Instagram
export const listInstagram = (limit = 12) => api.get('/instagram', { params: { limit } }).then(r => r.data);
export const adminListInstagram = () => api.get('/admin/instagram').then(r => r.data);
export const adminCreateInstagram = (p) => api.post('/admin/instagram', p).then(r => r.data);
export const adminUpdateInstagram = (id, p) => api.patch(`/admin/instagram/${id}`, p).then(r => r.data);
export const adminDeleteInstagram = (id) => api.delete(`/admin/instagram/${id}`).then(r => r.data);

// Analytics
export const trackEvent = (evt) => api.post('/analytics/track', evt).then(r => r.data).catch(() => null);
export const adminAnalyticsSummary = (days = 30) => api.get('/admin/analytics/summary', { params: { days } }).then(r => r.data);

// QR reviews (customer-side)
export const getQrReviewContext = (token) => api.get(`/r/${token}`).then(r => r.data);
export const submitQrReview = (token, payload) => api.post(`/r/${token}`, payload).then(r => r.data);
export const adminGenerateQr = (payload) => api.post('/admin/reviews/qr/generate', payload).then(r => r.data);
export const adminListQrTokens = () => api.get('/admin/reviews/qr').then(r => r.data);
export const adminDeleteQrToken = (token) => api.delete(`/admin/reviews/qr/${token}`).then(r => r.data);
export const qrImageUrl = (token) => `${API_BASE}/admin/reviews/qr/${token}/image.png`;

// Google Business Locations
export const adminListGoogleLocations = () => api.get('/admin/google-locations').then(r => r.data);
export const adminCreateGoogleLocation = (p) => api.post('/admin/google-locations', p).then(r => r.data);
export const adminUpdateGoogleLocation = (id, p) => api.patch(`/admin/google-locations/${id}`, p).then(r => r.data);
export const adminDeleteGoogleLocation = (id) => api.delete(`/admin/google-locations/${id}`).then(r => r.data);
export const adminSyncGoogleLocation = (id) => api.post(`/admin/google-locations/${id}/sync`).then(r => r.data);
export const adminSyncAllGoogleLocations = () => api.post('/admin/google-locations/sync-all').then(r => r.data);

// Generic (non-user-specific) review QR + public submission
export const adminGetGenericQr = () => api.get('/admin/reviews/generic-qr').then(r => r.data);
export const genericQrImageUrl = () => `${API_BASE}/admin/reviews/generic-qr/image.png`;
export const publicGenericQrImageUrl = () => `${API_BASE}/reviews/generic-qr.png`;
export const submitPublicReview = (payload) => api.post('/reviews/public', payload).then(r => r.data);

// Integration settings
export const adminListIntegrations = () => api.get('/admin/integrations').then(r => r.data);
export const adminSaveIntegration = (key, value) => api.put('/admin/integrations', { key, value }).then(r => r.data);
export const adminRevealIntegration = (key) => api.get(`/admin/integrations/${key}/reveal`).then(r => r.data);
export const adminClearIntegration = (key) => api.delete(`/admin/integrations/${key}`).then(r => r.data);

// Category admin (public list already exposed by listCategories in mock/mock)
export const adminCreateCategory = (p) => api.post('/admin/categories', p).then(r => r.data);
export const adminUpdateCategory = (id, p) => api.patch(`/admin/categories/${id}`, p).then(r => r.data);
export const adminDeleteCategory = (id) => api.delete(`/admin/categories/${id}`).then(r => r.data);
export const listAllCategories = () => api.get('/categories').then(r => r.data);

// Subcategories
export const fetchSubcategories = (categorySlug) => api.get('/subcategories', { params: categorySlug ? { category: categorySlug } : {} }).then(r => r.data);
export const fetchSubcategory = (slug, categorySlug) => api.get(`/subcategories/${slug}`, { params: categorySlug ? { category: categorySlug } : {} }).then(r => r.data);
export const adminListSubcategories = (cid) => api.get(`/admin/categories/${cid}/subcategories`).then(r => r.data);
export const adminCreateSubcategory = (cid, p) => api.post(`/admin/categories/${cid}/subcategories`, p).then(r => r.data);
export const adminUpdateSubcategory = (sid, p) => api.patch(`/admin/subcategories/${sid}`, p).then(r => r.data);
export const adminDeleteSubcategory = (sid) => api.delete(`/admin/subcategories/${sid}`).then(r => r.data);

// Reorder (drag-and-drop persistence)
export const adminReorderCategories = (ids) => api.post('/admin/categories/reorder', { ids }).then(r => r.data);
export const adminReorderSubcategories = (cid, ids) => api.post(`/admin/categories/${cid}/subcategories/reorder`, { ids }).then(r => r.data);
export const adminReorderProducts = (ids) => api.post('/admin/products/reorder', { ids }).then(r => r.data);

// Payment methods + checkout settings
export const fetchPaymentMethods = () => api.get('/payment-methods').then(r => r.data);
export const adminGetCheckoutSettings = () => api.get('/admin/checkout-settings').then(r => r.data);
export const adminUpdateCheckoutSettings = (p) => api.put('/admin/checkout-settings', p).then(r => r.data);
export const fetchTaxPreview = (items, discount = 0) => api.post('/checkout/tax-preview', { items, discount }).then(r => r.data);

// Newsletter enable/disable
export const adminGetNewsletterSettings = () => api.get('/admin/newsletter-settings').then(r => r.data);
export const adminUpdateNewsletterSettings = (p) => api.put('/admin/newsletter-settings', p).then(r => r.data);

// Size charts
export const fetchSizeCharts = (section) => api.get('/size-charts', { params: section ? { section } : {} }).then(r => r.data);
export const fetchSizeChart = (ref) => api.get(`/size-charts/${ref}`).then(r => r.data);
export const adminListSizeCharts = () => api.get('/admin/size-charts').then(r => r.data);
export const adminCreateSizeChart = (p) => api.post('/admin/size-charts', p).then(r => r.data);
export const adminUpdateSizeChart = (id, p) => api.patch(`/admin/size-charts/${id}`, p).then(r => r.data);
export const adminDeleteSizeChart = (id) => api.delete(`/admin/size-charts/${id}`).then(r => r.data);
export const adminReorderSizeCharts = (ids) => api.post('/admin/size-charts/reorder', { ids }).then(r => r.data);

// Admin users (RBAC)
export const adminListUsers = () => api.get('/admin/users').then(r => r.data);
export const adminInviteUser = (p) => api.post('/admin/users', p).then(r => r.data);
export const adminUpdateUser = (uid, p) => api.patch(`/admin/users/${uid}`, p).then(r => r.data);
export const adminDeleteUser = (uid) => api.delete(`/admin/users/${uid}`).then(r => r.data);
export const adminListRoles = () => api.get('/admin/roles').then(r => r.data);
