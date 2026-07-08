/**
 * Content registry — every editable string on the storefront lives here.
 * The Design tab in Admin renders this registry as an editable form.
 * At runtime, the ContentProvider merges DB overrides on top of these defaults.
 */

export const CONTENT_SECTIONS = [
  {
    id: 'announcement',
    label: 'Announcement bar (top scrolling strip)',
    items: [
      { key: 'announcement.item.1', default: 'FREE SHIPPING OVER ₹999 ACROSS INDIA', hint: 'Rotating strip message 1' },
      { key: 'announcement.item.2', default: 'PERSONALIZE ANY PRODUCT — LASER ENGRAVING AVAILABLE', hint: 'Rotating strip message 2' },
      { key: 'announcement.item.3', default: 'NEW FAITH CAP COLLECTION IS LIVE — SHOP NOW', hint: 'Rotating strip message 3' },
      { key: 'announcement.item.4', default: 'INTERNATIONAL SHIPPING WORLDWIDE', hint: 'Rotating strip message 4' },
    ],
  },
  {
    id: 'home.hero',
    label: 'Home — Hero (primary slide only)',
    items: [
      { key: 'home.hero.title', default: 'Share the Message of', hint: 'Main headline line (first slide only)' },
      { key: 'home.hero.subtitle', default: 'Faith-driven products, crafted to impact lives', hint: 'Paragraph below the headline' },
      { key: 'home.hero.cta.primary', default: 'Shop The Collection', hint: 'Primary CTA button label' },
      { key: 'home.hero.cta.secondary', default: 'Our Story', hint: 'Secondary link label' },
    ],
  },
  {
    id: 'home.strip',
    label: 'Home — Feature strip (4 icons)',
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
    id: 'home.categories',
    label: 'Home — Categories block',
    items: [
      { key: 'home.categories.eyebrow', default: 'Shop by Category' },
      { key: 'home.categories.title', default: 'Curated with intention' },
      { key: 'home.categories.subtitle', default: 'From wallets to caps — every piece designed to declare hope.' },
    ],
  },
  {
    id: 'home.about',
    label: 'Home — About story',
    items: [
      { key: 'home.about.eyebrow', default: 'Our story' },
      { key: 'home.about.title', default: 'Message-first. Beautifully made.' },
      { key: 'home.about.body', default: 'Wear The Hope began as a simple prayer to remind others they are loved — and grew into a full range of handcrafted scripture gifts, shipping worldwide from Mumbai.' },
      { key: 'home.about.cta', default: 'Learn more about us' },
    ],
  },
  {
    id: 'home.instagram',
    label: 'Home — Instagram feed',
    items: [
      { key: 'home.instagram.eyebrow', default: 'From our journal' },
      { key: 'home.instagram.title', default: 'Live love. Share hope.' },
      { key: 'home.instagram.cta', default: 'Follow @wearthehope' },
    ],
  },
  {
    id: 'home.testimonials',
    label: 'Home — Testimonials',
    items: [
      { key: 'home.testimonials.eyebrow', default: 'Words from the community' },
      { key: 'home.testimonials.title', default: 'Hope, in their words' },
    ],
  },
  {
    id: 'shop',
    label: 'Shop page',
    items: [
      { key: 'shop.title', default: 'Shop the collection' },
      { key: 'shop.subtitle', default: 'Every piece designed to remind you — and someone you love — that you are held.' },
      { key: 'shop.filters.title', default: 'Filters' },
      { key: 'shop.empty.title', default: 'No products found' },
      { key: 'shop.empty.body', default: 'Try adjusting your filters or search terms.' },
    ],
  },
  {
    id: 'about',
    label: 'About page',
    items: [
      { key: 'about.hero.eyebrow', default: 'Our story' },
      { key: 'about.hero.title', default: 'A brand built on hope' },
      { key: 'about.hero.body', default: 'Wear The Hope is a motivational gift brand. Every piece we make is designed to declare love, hope and faith — starting from a small workshop in Mumbai, shipped with prayer worldwide.' },
      { key: 'about.mission.title', default: 'Our mission' },
      { key: 'about.mission.body', default: 'To create everyday products that carry a message of hope — reminders that pause the noise and lift the spirit.' },
      { key: 'about.values.title', default: 'What we stand for' },
    ],
  },
  {
    id: 'blog',
    label: 'Journal (Blog) index',
    items: [
      { key: 'blog.title', default: 'The Journal' },
      { key: 'blog.subtitle', default: 'Stories of hope, craft, and faith from the Wear The Hope community.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact page',
    items: [
      { key: 'contact.title', default: 'Get in touch' },
      { key: 'contact.subtitle', default: "We'd love to hear from you — questions, custom orders, wholesale, prayer requests." },
      { key: 'contact.locations.title', default: 'Visit us' },
      { key: 'contact.form.name', default: 'Your name' },
      { key: 'contact.form.email', default: 'Email address' },
      { key: 'contact.form.message', default: 'How can we help?' },
      { key: 'contact.form.submit', default: 'Send message' },
    ],
  },
  {
    id: 'product',
    label: 'Product detail page labels',
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
  {
    id: 'footer',
    label: 'Footer',
    items: [
      { key: 'footer.newsletter.title', default: 'Join our journey of hope' },
      { key: 'footer.newsletter.subtitle', default: 'Subscribe for scripture drops, new collections and exclusive gifts — straight to your inbox.' },
      { key: 'footer.newsletter.placeholder', default: 'Enter your email' },
      { key: 'footer.newsletter.cta', default: 'Subscribe' },
      { key: 'footer.review.eyebrow', default: 'Share your story' },
      { key: 'footer.review.title', default: 'Loved your Wear The Hope piece? Tell the world.' },
      { key: 'footer.review.body', default: 'Scan the QR — or use the link below — to leave a review. Your words help other believers find us.' },
      { key: 'footer.review.cta', default: 'Leave a review' },
      { key: 'footer.review.instagram', default: 'Tag @wearthehope' },
      { key: 'footer.tagline', default: 'A motivational gift brand — declaring love and hope through everyday products. Handcrafted with intention since 2018.' },
      { key: 'footer.col.shop', default: 'Shop' },
      { key: 'footer.col.company', default: 'Company' },
      { key: 'footer.col.contact', default: 'Contact' },
      { key: 'footer.links.story', default: 'Our Story' },
      { key: 'footer.links.contact', default: 'Contact Us' },
      { key: 'footer.links.size', default: 'Size Guide' },
      { key: 'footer.links.terms', default: 'Terms & Conditions' },
      { key: 'footer.links.privacy', default: 'Privacy Policy' },
      { key: 'footer.links.refund', default: 'Refund & Cancellation' },
      { key: 'footer.contact.location', default: 'Mumbai, India — Ships Worldwide' },
      { key: 'footer.us_partner.cta', default: 'Visit US Partner' },
      { key: 'footer.legal.copyright', default: '© {year} Wear The Hope. All rights reserved.' },
      { key: 'footer.legal.made', default: 'Handcrafted with love in India — Shipping Worldwide' },
    ],
  },
];

// Flatten default map for O(1) lookup at runtime
export const CONTENT_DEFAULTS = CONTENT_SECTIONS.reduce((acc, section) => {
  section.items.forEach(item => { acc[item.key] = item.default; });
  return acc;
}, {});
