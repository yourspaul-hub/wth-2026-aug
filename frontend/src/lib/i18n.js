import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const STORAGE_KEY = 'wth_lang';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        shop: 'Shop',
        collections: 'Collections',
        about: 'About',
        journal: 'Journal',
        contact: 'Contact',
        search: 'Search',
        wishlist: 'Wishlist',
        bag: 'Bag',
        search_placeholder: 'Search for scripture wallets, tees, mugs...',
      },
      common: {
        add_to_bag: 'Add to Bag',
        add_to_cart: 'Add to Cart',
        out_of_stock: 'Out of Stock',
        buy_now: 'Buy Now',
        proceed_to_checkout: 'Proceed to Checkout',
        continue_shopping: 'Continue Shopping',
        remove: 'Remove',
        move_to_bag: 'Move to Bag',
        share: 'Share',
        quick_view: 'Quick View',
        loading: 'Loading...',
        subtotal: 'Subtotal',
        shipping: 'Shipping',
        free: 'Free',
        total: 'Total',
        discount: 'Discount',
        added_to_wishlist: 'Added to wishlist',
        removed_from_wishlist: 'Removed from wishlist',
        added_to_bag: 'added to bag',
      },
      product: {
        recommendations: 'You may also love',
        recently_viewed: 'Recently viewed',
        related: 'Related products',
        in_stock: 'In stock',
        rating: 'Rating',
        reviews: 'reviews',
        details: 'Details',
        shipping: 'Shipping',
      },
      wishlist: {
        title: 'Your Wishlist',
        subtitle: 'Saved items just for you',
        empty_title: 'Your wishlist is empty',
        empty_subtitle: 'Save items you love by tapping the heart on any product.',
        browse_shop: 'Browse the shop',
        items_saved: '{{count}} items saved',
        move_all_to_bag: 'Move all to bag',
        clear: 'Clear wishlist',
      },
      cart: {
        title: 'Your Bag',
        empty_title: 'Your bag is empty',
        empty_subtitle: "Let's fill it with hope and grace.",
        clear_bag: 'Clear bag',
        start_shopping: 'Start Shopping',
      },
      footer: {
        newsletter_title: 'Subscribe for hope in your inbox',
        newsletter_placeholder: 'Enter your email',
        subscribe: 'Subscribe',
      },
    },
  },
  hi: {
    translation: {
      nav: {
        home: 'होम',
        shop: 'शॉप',
        collections: 'कलेक्शन',
        about: 'हमारे बारे में',
        journal: 'जर्नल',
        contact: 'संपर्क',
        search: 'खोजें',
        wishlist: 'विशलिस्ट',
        bag: 'बैग',
        search_placeholder: 'वॉलेट, टीज़, मग खोजें...',
      },
      common: {
        add_to_bag: 'बैग में जोड़ें',
        add_to_cart: 'कार्ट में जोड़ें',
        out_of_stock: 'स्टॉक ख़त्म',
        buy_now: 'अभी खरीदें',
        proceed_to_checkout: 'चेकआउट पर जाएँ',
        continue_shopping: 'खरीदारी जारी रखें',
        remove: 'हटाएँ',
        move_to_bag: 'बैग में ले जाएँ',
        share: 'शेयर',
        quick_view: 'क्विक व्यू',
        loading: 'लोड हो रहा है...',
        subtotal: 'उप-योग',
        shipping: 'शिपिंग',
        free: 'मुफ़्त',
        total: 'कुल',
        discount: 'छूट',
        added_to_wishlist: 'विशलिस्ट में जोड़ा गया',
        removed_from_wishlist: 'विशलिस्ट से हटाया गया',
        added_to_bag: 'बैग में जोड़ा गया',
      },
      product: {
        recommendations: 'आपको ये भी पसंद आ सकते हैं',
        recently_viewed: 'हाल ही में देखा',
        related: 'सम्बंधित उत्पाद',
        in_stock: 'स्टॉक में',
        rating: 'रेटिंग',
        reviews: 'समीक्षाएँ',
        details: 'विवरण',
        shipping: 'शिपिंग',
      },
      wishlist: {
        title: 'आपकी विशलिस्ट',
        subtitle: 'आपके लिए सहेजे गए आइटम',
        empty_title: 'आपकी विशलिस्ट खाली है',
        empty_subtitle: 'किसी भी उत्पाद पर हार्ट टैप करके पसंद के आइटम सहेजें।',
        browse_shop: 'शॉप देखें',
        items_saved: '{{count}} आइटम सहेजे गए',
        move_all_to_bag: 'सब बैग में ले जाएँ',
        clear: 'विशलिस्ट साफ़ करें',
      },
      cart: {
        title: 'आपका बैग',
        empty_title: 'आपका बैग खाली है',
        empty_subtitle: 'चलिए इसे आशा और अनुग्रह से भरें।',
        clear_bag: 'बैग खाली करें',
        start_shopping: 'शॉपिंग शुरू करें',
      },
      footer: {
        newsletter_title: 'अपने इनबॉक्स में आशा पाएँ',
        newsletter_placeholder: 'अपना ईमेल डालें',
        subscribe: 'सब्सक्राइब',
      },
    },
  },
};

const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export const supportedLanguages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

export const setLanguage = (code) => {
  i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* noop */ }
};

export default i18n;
