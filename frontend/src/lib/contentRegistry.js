/**
 * Content registry — every editable string on the storefront lives here.
 * The Admin Design tab renders this registry as an editable form.
 *
 * Structure:
 *   - PAGES  → high-level buckets shown as the top-level page filter
 *   - Each section has a `page` field mapping it to one of the pages above.
 *   - Each item has a stable slug (`key`), a `default` value, and an optional hint.
 *
 * Convention for italic accent styling: fields ending in ".title_accent" render
 * italic in the flamingo/brown accent color. The main title field is normal weight.
 */

export const PAGES = [
  { id: 'global', label: 'Global (Announcement, Footer)' },
  { id: 'home', label: 'Home page' },
  { id: 'shop', label: 'Shop / Collections' },
  { id: 'product', label: 'Product detail' },
  { id: 'about', label: 'About page' },
  { id: 'blog', label: 'Journal / Blog' },
  { id: 'contact', label: 'Contact page' },
];

export const CONTENT_SECTIONS = [
  // ================= GLOBAL =================
  {
    id: 'announcement', page: 'global',
    label: 'Announcement bar (top scrolling strip)',
    items: [
      { key: 'announcement.item.1', default: 'FREE SHIPPING OVER ₹999 ACROSS INDIA', hint: 'Rotating strip message 1 — leave blank to remove' },
      { key: 'announcement.item.2', default: 'PERSONALIZE ANY PRODUCT — LASER ENGRAVING AVAILABLE' },
      { key: 'announcement.item.3', default: 'NEW FAITH CAP COLLECTION IS LIVE — SHOP NOW' },
      { key: 'announcement.item.4', default: 'INTERNATIONAL SHIPPING WORLDWIDE' },
    ],
  },
  {
    id: 'footer.newsletter', page: 'global',
    label: 'Footer — Newsletter block',
    items: [
      { key: 'footer.newsletter.title', default: 'Join our journey of', hint: 'Main headline' },
      { key: 'footer.newsletter.title_accent', default: 'hope', hint: 'Italic accent word (flamingo colour)' },
      { key: 'footer.newsletter.subtitle', default: 'Subscribe for scripture drops, new collections and exclusive gifts — straight to your inbox.' },
      { key: 'footer.newsletter.placeholder', default: 'Enter your email' },
      { key: 'footer.newsletter.cta', default: 'Subscribe' },
    ],
  },
  {
    id: 'footer.review', page: 'global',
    label: 'Footer — "Share your story" QR block',
    items: [
      { key: 'footer.review.eyebrow', default: 'Share your story' },
      { key: 'footer.review.title', default: 'Loved your Wear The Hope piece?' },
      { key: 'footer.review.title_accent', default: 'Tell the world.', hint: 'Italic accent phrase' },
      { key: 'footer.review.body', default: 'Scan the QR — or use the link below — to leave a review. Your words help other believers find us.' },
      { key: 'footer.review.cta', default: 'Leave a review' },
      { key: 'footer.review.instagram', default: 'Tag @wearthehope' },
    ],
  },
  {
    id: 'footer.brand', page: 'global',
    label: 'Footer — Brand column',
    items: [
      { key: 'footer.tagline', default: 'A motivational gift brand — declaring love and hope through everyday products. Handcrafted with intention since 2018.' },
    ],
  },
  {
    id: 'footer.columns', page: 'global',
    label: 'Footer — Column headings & links',
    items: [
      { key: 'footer.col.shop', default: 'Shop' },
      { key: 'footer.col.company', default: 'Company' },
      { key: 'footer.col.contact', default: 'Contact' },
      { key: 'footer.links.story', default: 'Our Story' },
      { key: 'footer.links.contact', default: 'Contact Us' },
      { key: 'footer.links.size', default: 'Size Guide' },
      { key: 'footer.links.terms', default: 'Terms & Conditions' },
      { key: 'footer.links.privacy', default: 'Privacy Policy' },
      { key: 'footer.links.refund', default: 'Refund & Cancellation' },
      { key: 'footer.us_partner.cta', default: 'Visit US Partner' },
    ],
  },
  {
    id: 'footer.contact', page: 'global',
    label: 'Footer — Contact details',
    items: [
      { key: 'footer.contact.phone', default: '+91 9004373305', hint: 'Phone number shown in the footer contact column' },
      { key: 'footer.contact.email', default: 'hello@wearthehope.com', hint: 'Support email shown in the footer contact column' },
      { key: 'footer.contact.location', default: 'Mumbai, India — Ships Worldwide' },
    ],
  },
  {
    id: 'footer.legal', page: 'global',
    label: 'Footer — Legal strip (bottom)',
    items: [
      { key: 'footer.legal.copyright', default: '© {year} Wear The Hope. All rights reserved.', hint: '{year} is auto-replaced with the current year' },
      { key: 'footer.legal.made', default: 'Handcrafted with love in India — Shipping Worldwide' },
    ],
  },

  // ================= HOME =================
  {
    id: 'home.hero', page: 'home',
    label: 'Home — Hero (shared text)',
    items: [
      { key: 'home.hero.eyebrow', default: 'Since December 2018', hint: 'Small badge above the headline (shared across all hero slides)' },
      { key: 'home.hero.cta.secondary', default: 'Our Story', hint: 'Secondary text link under CTA' },
      { key: 'home.hero.stat1.value', default: '10K+', hint: 'Big number on badge 1' },
      { key: 'home.hero.stat1.label', default: 'Happy Customers', hint: 'Label on badge 1' },
      { key: 'home.hero.stat2.value', default: '180+' },
      { key: 'home.hero.stat2.label', default: 'Unique Designs' },
      { key: 'home.hero.stat3.value', default: '4.9★' },
      { key: 'home.hero.stat3.label', default: 'Google Rating' },
    ],
  },
  {
    id: 'home.strip', page: 'home',
    label: 'Home — Feature strip (4 icon items)',
    items: [
      { key: 'home.strip.1.title', default: 'Ships Worldwide' },
      { key: 'home.strip.1.sub',   default: 'Free over ₹999 in India' },
      { key: 'home.strip.2.title', default: 'Fully Customizable' },
      { key: 'home.strip.2.sub',   default: 'Laser engraving on request' },
      { key: 'home.strip.3.title', default: 'Handcrafted Quality' },
      { key: 'home.strip.3.sub',   default: 'Every item checked twice' },
      { key: 'home.strip.4.title', default: 'Easy Returns' },
      { key: 'home.strip.4.sub',   default: '7-day hassle-free returns' },
    ],
  },
  {
    id: 'home.categories', page: 'home',
    label: 'Home — "Shop by Category" block',
    items: [
      { key: 'home.categories.eyebrow', default: 'Curated Categories' },
      { key: 'home.categories.title', default: 'Shop by', hint: 'Main heading (normal weight)' },
      { key: 'home.categories.title_accent', default: 'purpose', hint: 'Italic accent word' },
      { key: 'home.categories.subtitle', default: '', hint: 'Optional lead paragraph — leave blank to hide' },
    ],
  },
  {
    id: 'home.about', page: 'home',
    label: 'Home — About story block',
    items: [
      { key: 'home.about.eyebrow', default: 'Our Story' },
      { key: 'home.about.title', default: 'Five loaves. Two fish.', hint: 'Main heading' },
      { key: 'home.about.title_accent', default: 'One mission.', hint: 'Italic accent phrase' },
      { key: 'home.about.body', default: 'We started as a small hobby project in December 2018, holding on to a simple vision — to offer our "5 loaves and 2 fish" to God and impact the people of the nations.\n\nEvery wallet, tumbler, tote and tee that leaves our studio carries a whisper of scripture and a wave of hope. We create and customize for individuals, teams, organizations and churches worldwide.\n\n"We sincerely hope our products will impact your life and those around you."', hint: 'Multi-paragraph body — new lines preserved' },
      { key: 'home.about.cta', default: 'Read Full Story', hint: 'Text link below the CTA' },
      { key: 'home.about.catalogue_cta', default: 'Download Catalogue', hint: 'Solid button label' },
      { key: 'home.about.badge_year', default: 'Since 2018', hint: 'White card badge — big line' },
      { key: 'home.about.badge_sub',  default: 'A hobby project turned mission', hint: 'White card badge — small line' },
    ],
  },
  {
    id: 'home.instagram', page: 'home',
    label: 'Home — Instagram feed block',
    items: [
      { key: 'home.instagram.eyebrow', default: 'Follow along' },
      { key: 'home.instagram.title_main', default: '@', hint: 'Prefix before the italic handle (normal weight)' },
      { key: 'home.instagram.title_accent', default: 'wearthehope', hint: 'Italic accent (Instagram handle)' },
      { key: 'home.instagram.body', default: 'Tag us in your Wear The Hope moments and get featured — over 10K+ believers spreading love and hope.' },
      { key: 'home.instagram.url', default: 'https://www.instagram.com/wearthehope', hint: 'Instagram profile URL' },
    ],
  },
  {
    id: 'home.testimonials', page: 'home',
    label: 'Home — Testimonials block',
    items: [
      { key: 'home.testimonials.eyebrow', default: 'What Our Customers Say' },
      { key: 'home.testimonials.title', default: 'Loved by', hint: 'Main heading' },
      { key: 'home.testimonials.title_accent', default: 'believers worldwide', hint: 'Italic accent phrase' },
      { key: 'home.testimonials.rating_label', default: '4.9 / 5 on Google Reviews' },
    ],
  },

  // ================= SHOP =================
  {
    id: 'shop', page: 'shop',
    label: 'Shop / Collections page',
    items: [
      { key: 'shop.title', default: 'All Collections', hint: 'Page heading' },
      { key: 'shop.subtitle', default: 'Explore our full range', hint: 'Subtitle beneath the heading' },
      { key: 'shop.filters.title', default: 'Filters' },
      { key: 'shop.empty.title', default: 'Nothing here yet' },
      { key: 'shop.empty.body', default: 'Try adjusting your filters or explore other collections.' },
    ],
  },

  // ================= ABOUT =================
  {
    id: 'about', page: 'about',
    label: 'About page — Hero + Mission + Values',
    items: [
      { key: 'about.hero.eyebrow', default: 'Our Story' },
      { key: 'about.hero.title', default: 'This began with a vision —', hint: 'Main heading' },
      { key: 'about.hero.title_accent', default: 'not a business plan', hint: 'Italic accent phrase (second line)' },
      { key: 'about.hero.body', default: 'In late 2018, God awakened us in the middle of night with a vivid vision — a kiosk filled with unique products carrying His message of hope. No experience, no roadmap, no certainty. Only obedience.' },
      { key: 'about.mission.eyebrow', default: 'From vision to obedience' },
      { key: 'about.mission.title', default: 'Five loaves.', hint: 'Main heading' },
      { key: 'about.mission.title_accent', default: 'Two fish. One God.', hint: 'Italic accent phrase' },
      { key: 'about.mission.body', default: "In early 2019, Wear The Hope was launched as a humble home-based business creating faith-inspired clothing, gifts, and personalized merchandise. We had no experience in this industry, no clear roadmap, and no certainty about how such a vision could become reality — but we knew that obedience always comes before understanding.\n\nAt the very same time, we were walking through one of the most difficult financial seasons of our lives. Yet, like Joshua stepping into the Jordan before the waters parted, we chose to step forward in faith rather than retreat in fear. We placed our humble five loaves and two fish into God's hands, believing He could multiply a small act of obedience into something that would impact lives across the nations.\n\nBy God's grace, what began with limited resources has grown into a registered brand serving customers across India and beyond. Every product we create carries a simple prayer — that it will inspire hope, strengthen faith, and remind someone that they are deeply loved and never forgotten.", hint: 'Multi-paragraph body — new lines preserved' },
      { key: 'about.mission.quote', default: '"Business can be a ministry. Partnerships can become platforms for transformation."', hint: 'Italic quote in flamingo color' },
      { key: 'about.values.eyebrow', default: 'What we believe' },
      { key: 'about.values.title', default: 'Building lives before brands' },
    ],
  },

  // ================= BLOG =================
  {
    id: 'blog', page: 'blog',
    label: 'Journal (Blog) — Index page',
    items: [
      { key: 'blog.eyebrow', default: 'The journal' },
      { key: 'blog.title', default: 'Stories of', hint: 'Main heading' },
      { key: 'blog.title_accent', default: 'hope', hint: 'Italic accent word' },
      { key: 'blog.subtitle', default: 'Craft notes, gifting guides and stories behind the pieces we make.' },
    ],
  },

  // ================= CONTACT =================
  {
    id: 'contact', page: 'contact',
    label: 'Contact page — Hero, Locations, Form',
    items: [
      { key: 'contact.eyebrow', default: "We'd love to hear from you" },
      { key: 'contact.title', default: 'Get in', hint: 'Main heading' },
      { key: 'contact.title_accent', default: 'touch', hint: 'Italic accent word' },
      { key: 'contact.subtitle', default: 'Custom order, bulk enquiry, partnership or just to say hi — our inbox is always open.' },
      { key: 'contact.locations.title', default: 'Our', hint: 'Locations block heading' },
      { key: 'contact.locations.title_accent', default: 'locations', hint: 'Italic accent word' },
      { key: 'contact.form.name', default: 'Your name' },
      { key: 'contact.form.email', default: 'Email' },
      { key: 'contact.form.message', default: 'Message' },
      { key: 'contact.form.submit', default: 'Send Message' },
    ],
  },

  // ================= PRODUCT DETAIL =================
  {
    id: 'product', page: 'product',
    label: 'Product detail — Labels & tabs',
    items: [
      { key: 'pd.details', default: 'Details' },
      { key: 'pd.shipping', default: 'Shipping' },
      { key: 'pd.reviews', default: 'Reviews' },
      { key: 'pd.customize.label', default: 'Personalize (optional)' },
      { key: 'pd.customize.placeholder', default: 'Add a name or short verse' },
      { key: 'pd.badge.free_ship.title', default: 'Free Shipping' },
      { key: 'pd.badge.free_ship.sub', default: 'On orders ₹999+' },
      { key: 'pd.badge.returns.title', default: 'Easy Returns' },
      { key: 'pd.badge.returns.sub', default: '7-day window' },
      { key: 'pd.badge.gift.title', default: 'Gift Wrapped' },
      { key: 'pd.badge.gift.sub', default: 'Ready to give' },
      { key: 'pd.taxes_note', default: 'Inclusive of all taxes' },
    ],
  },
];

// Flatten default map for O(1) lookup at runtime
export const CONTENT_DEFAULTS = CONTENT_SECTIONS.reduce((acc, section) => {
  section.items.forEach(item => { acc[item.key] = item.default; });
  return acc;
}, {});
