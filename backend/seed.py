"""Seed initial products, categories, reviews from mock data."""
from datetime import datetime, timezone, timedelta
import asyncio

CATEGORIES_SEED = [
    {'name': 'Drinkware', 'slug': 'drinkware', 'tagline': 'Sip scripture, hold hope', 'image': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwzfHxtdWd8ZW58MHx8fHwxNzgzMzI2MTEwfDA&ixlib=rb-4.1.0&q=85', 'order': 1},
    {'name': 'Clothing', 'slug': 'clothing', 'tagline': 'Wear your declaration', 'image': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwyfHx0c2hpcnR8ZW58MHx8fHwxNzgzMzI2MTkwfDA&ixlib=rb-4.1.0&q=85', 'order': 2},
    {'name': 'Bags', 'slug': 'bags', 'tagline': 'Carry the message', 'image': 'https://images.unsplash.com/photo-1544816155-12df9643f363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHx0b3RlJTIwYmFnfGVufDB8fHx8MTc4MzMyNjExMHww&ixlib=rb-4.1.0&q=85', 'order': 3},
    {'name': 'Boards', 'slug': 'boards', 'tagline': 'Kitchen with scripture', 'image': 'https://images.unsplash.com/photo-1666013942797-9daa4b8b3b4f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxjaG9wcGluZyUyMGJvYXJkfGVufDB8fHx8MTc4MzMyNjIwMXww&ixlib=rb-4.1.0&q=85', 'order': 4},
    {'name': 'Tags', 'slug': 'tags', 'tagline': 'Travel with purpose', 'image': 'https://images.unsplash.com/photo-1587533421909-c695540fbaac?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxsdWdnYWdlJTIwdGFnfGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'order': 5},
    {'name': 'Badges & Magnets', 'slug': 'badges-magnets', 'tagline': 'Small tokens, big faith', 'image': 'https://images.unsplash.com/photo-1625768376503-68d2495d78c5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxzdGlja2VyfGVufDB8fHx8MTc4MzMyNjE5MHww&ixlib=rb-4.1.0&q=85', 'order': 6},
    {'name': 'Head Gear', 'slug': 'head-gear', 'tagline': 'Crown of confidence', 'image': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxjYXB8ZW58MHx8fHwxNzgzMzI2MTE3fDA&ixlib=rb-4.1.0&q=85', 'order': 7},
    {'name': 'Stickers', 'slug': 'stickers', 'tagline': 'Stick the word everywhere', 'image': 'https://images.unsplash.com/photo-1633533452206-8ab246b00e30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwyfHxzdGlja2VyfGVufDB8fHx8MTc4MzMyNjE5MHww&ixlib=rb-4.1.0&q=85', 'order': 8},
    {'name': 'Jewellery', 'slug': 'jewellery', 'tagline': 'Coming Soon', 'image': 'https://images.unsplash.com/photo-1499652848871-1527a310b13a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHw0fHxiaWJsZXxlbnwwfHx8fDE3ODMzMjYxMTd8MA&ixlib=rb-4.1.0&q=85', 'coming_soon': True, 'order': 9},
    {'name': 'Wall Frames', 'slug': 'wall-frames', 'tagline': 'Coming Soon', 'image': 'https://images.unsplash.com/photo-1699465301322-362016624dd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHx3YWxsJTIwYXJ0fGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'coming_soon': True, 'order': 10},
]

PRODUCTS_SEED = [
    {'slug': 'faith-cap-blessed', 'name': 'Faith Cap — Blessed Edition', 'cat_slug': 'head-gear', 'price': 899, 'original_price': 1199, 'image': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxjYXB8ZW58MHx8fHwxNzgzMzI2MTE3fDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1521369909029-2afed882baee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxjYXB8ZW58MHx8fHwxNzgzMzI2MTE3fDA&ixlib=rb-4.1.0&q=85', 'verse': 'You are chosen, loved and favored', 'tag': 'Bestseller', 'rating': 4.9, 'reviews': 124, 'colors': ['#0F1F3B', '#1A1A1A', '#4A5B6C'], 'description': 'Premium 100% cotton baseball cap with embroidered "Blessed" text. A daily reminder to walk in confidence and grace.'},
    {'slug': 'scripture-wallet', 'name': 'Personalized Scripture Wallet', 'cat_slug': 'clothing', 'price': 1499, 'original_price': 1899, 'image': 'https://images.unsplash.com/photo-1627123424574-724758594e93?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHx3YWxsZXR8ZW58MHx8fHwxNzgzMzI2MTkwfDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.pexels.com/photos/6444094/pexels-photo-6444094.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940', 'verse': 'Philippians 4:19', 'tag': 'Customizable', 'rating': 5.0, 'reviews': 87, 'colors': ['#5C3A22', '#000000'], 'description': 'Handcrafted genuine leather wallet with laser-engraved name and Bible verse of your choice. Perfect personalized gift.'},
    {'slug': 'yhwh-canvas-frame', 'name': 'YHWH Minimalist Canvas Frame', 'cat_slug': 'wall-frames', 'price': 2199, 'original_price': 2799, 'image': 'https://images.unsplash.com/photo-1699465301322-362016624dd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHx3YWxsJTIwYXJ0fGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHw0fHx3YWxsJTIwYXJ0fGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'verse': 'The Most Holy Name', 'tag': 'New', 'rating': 4.8, 'reviews': 42, 'colors': ['#F5F0E8'], 'description': 'Timeless minimalist canvas featuring YHWH in stunning calligraphy. A sacred declaration for your home.'},
    {'slug': 'grace-sufficient-tote', 'name': 'Grace Sufficient Tote Bag', 'cat_slug': 'bags', 'price': 649, 'original_price': 799, 'image': 'https://images.unsplash.com/photo-1544816155-12df9643f363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHx0b3RlJTIwYmFnfGVufDB8fHx8MTc4MzMyNjExMHww&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1630381260512-e3fe55c11973?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHx0b3RlJTIwYmFnfGVufDB8fHx8MTc4MzMyNjExMHww&ixlib=rb-4.1.0&q=85', 'verse': '2 Corinthians 12:9', 'tag': 'Trending', 'rating': 4.7, 'reviews': 156, 'colors': ['#FFFFFF', '#F5F0E8'], 'description': 'Cotton canvas tote with hand-drawn floral wreath and "My Grace is Sufficient" print. Eco-friendly and stylish.'},
    {'slug': 'butterfly-tumbler', 'name': 'Perhaps the Butterfly Tumbler', 'cat_slug': 'drinkware', 'price': 999, 'original_price': 1299, 'image': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwzfHxtdWd8ZW58MHx8fHwxNzgzMzI2MTEwfDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1516390118834-21602d501886?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxtdWd8ZW58MHx8fHwxNzgzMzI2MTEwfDA&ixlib=rb-4.1.0&q=85', 'verse': 'Perhaps the Butterfly', 'tag': 'Signature', 'rating': 4.9, 'reviews': 210, 'colors': ['#FFFFFF', '#F8C8D8'], 'description': 'Insulated skinny tumbler with a message of transformation. Keeps drinks hot for 6 hrs, cold for 12 hrs.'},
    {'slug': 'faith-coasters', 'name': 'Faith Coasters — Glass Set of 4', 'cat_slug': 'boards', 'price': 799, 'original_price': 999, 'image': 'https://images.unsplash.com/photo-1554230253-017daba2b631?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwyfHx3b29kZW4lMjBjb2FzdGVyfGVufDB8fHx8MTc4MzMyNjExMHww&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1587132117816-061b35073a4e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBjb2FzdGVyfGVufDB8fHx8MTc4MzMyNjExMHww&ixlib=rb-4.1.0&q=85', 'verse': 'Set of 4 designs', 'tag': 'Gift Ready', 'rating': 4.8, 'reviews': 68, 'colors': ['#8B5A2B'], 'description': 'Hand-finished wooden coasters with scripture engravings. Sold in sets of 4 with unique designs.'},
    {'slug': 'god-will-make-way-tag', 'name': 'God Will Make A Way — Luggage Tag', 'cat_slug': 'tags', 'price': 349, 'original_price': 499, 'image': 'https://images.unsplash.com/photo-1587533421909-c695540fbaac?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxsdWdnYWdlJTIwdGFnfGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1720430544263-a616840d04b3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwyfHxsdWdnYWdlJTIwdGFnfGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'verse': 'Isaiah 43:15-16', 'tag': 'Traveler', 'rating': 4.9, 'reviews': 92, 'colors': ['#FFDD00', '#0F1F3B'], 'description': 'Laser-engraved custom luggage tag with your name & contact. Bold, faith-fueled traveling companion.'},
    {'slug': 'wood-keychain', 'name': 'Wood Carved Custom Keychain', 'cat_slug': 'badges-magnets', 'price': 249, 'original_price': 349, 'image': 'https://images.unsplash.com/photo-1609587415882-97552f39c6c2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxrZXklMjBob2xkZXJ8ZW58MHx8fHwxNzgzMzI2MjAyfDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1685886069739-c1b96bba7953?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxrZXklMjBob2xkZXJ8ZW58MHx8fHwxNzgzMzI2MjAyfDA&ixlib=rb-4.1.0&q=85', 'verse': 'Cold Burn Tech', 'tag': 'Custom', 'rating': 5.0, 'reviews': 47, 'colors': ['#8B5A2B', '#5C3A22'], 'description': 'Ultra-detailed personalized wood keychain with initials, couple names or custom designs.'},
    {'slug': 'psalm-46-tee', 'name': 'Psalm 46 Statement Tee', 'cat_slug': 'clothing', 'price': 799, 'original_price': 1099, 'image': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwyfHx0c2hpcnR8ZW58MHx8fHwxNzgzMzI2MTkwfDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHx0c2hpcnR8ZW58MHx8fHwxNzgzMzI2MTkwfDA&ixlib=rb-4.1.0&q=85', 'verse': 'God is my refuge', 'tag': 'Bestseller', 'rating': 4.9, 'reviews': 340, 'colors': ['#0F1F3B', '#F5D0CE', '#1A1A1A'], 'description': '100% premium cotton tee with a bold Psalm 46 print. Soft, breathable and built to last.'},
    {'slug': 'scripture-pen-stand', 'name': 'Scripture Pen Stand', 'cat_slug': 'boards', 'price': 549, 'original_price': 749, 'image': 'https://images.unsplash.com/photo-1627629738777-b15db722c79d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxwZW4lMjBzdGFuZHxlbnwwfHx8fDE3ODMzMjYxOTB8MA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1620275765334-4ed948bb4502?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxub3RlYm9va3xlbnwwfHx8fDE3ODMzMjYxOTB8MA&ixlib=rb-4.1.0&q=85', 'verse': 'Any language print', 'tag': 'Multi-language', 'rating': 4.8, 'reviews': 34, 'colors': ['#8B5A2B'], 'description': 'Customized wooden pen stand with scripture in any language of your choice. Pan-India shipping.'},
    {'slug': 'borosil-christmas-set', 'name': 'Christmas Borosil Glass Set (6)', 'cat_slug': 'drinkware', 'price': 1299, 'original_price': 1599, 'image': 'https://images.unsplash.com/photo-1643946404043-178456b0e3f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHw0fHxtdWd8ZW58MHx8fHwxNzgzMzI2MTEwfDA&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1516390118834-21602d501886?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxtdWd8ZW58MHx8fHwxNzgzMzI2MTEwfDA&ixlib=rb-4.1.0&q=85', 'verse': 'Love & Hope', 'tag': 'Festive', 'rating': 4.9, 'reviews': 78, 'colors': ['#FFFFFF'], 'description': 'Borosil juice glass set of 6 with festive Christmas engraving. Perfect for celebrations or gifting.'},
    {'slug': 'jehovah-jireh-canvas', 'name': 'Jehovah Jireh Wall Canvas', 'cat_slug': 'wall-frames', 'price': 1899, 'original_price': 2399, 'image': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHw0fHx3YWxsJTIwYXJ0fGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'hover_image': 'https://images.unsplash.com/photo-1699465301322-362016624dd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHx3YWxsJTIwYXJ0fGVufDB8fHx8MTc4MzMyNjExN3ww&ixlib=rb-4.1.0&q=85', 'verse': 'The Lord Will Provide', 'tag': 'New', 'rating': 4.8, 'reviews': 29, 'colors': ['#F5F0E8'], 'description': 'Minimalist canvas frame with the powerful name Jehovah Jireh. Perfect for prayer rooms or meaningful gifts.'},
]

REVIEWS_SEED = [
    {'name': 'Anna Jacob', 'when': '3 months ago', 'rating': 5, 'text': 'Excellent!', 'avatar': 'https://ui-avatars.com/api/?name=Anna+Jacob&background=C4623B&color=fff', 'order': 1},
    {'name': 'Sujata Jayaprakash', 'when': '6 months ago', 'rating': 5, 'text': 'I ordered 3 wallets with names and bible verses engraved for my family members. Loved the precision, customisation of names on the wallet and even the boxes making them a personalized gifts. Thank you.', 'avatar': 'https://ui-avatars.com/api/?name=Sujata+J&background=8B5A2B&color=fff', 'order': 2},
    {'name': 'Mathew Dalis', 'when': '6 months ago', 'rating': 5, 'text': 'Very nice quality. Great looks. Wonderful service.', 'avatar': 'https://ui-avatars.com/api/?name=Mathew+Dalis&background=0F1F3B&color=fff', 'order': 3},
    {'name': 'TravelWell', 'when': '6 months ago', 'rating': 5, 'text': 'Very exquisite set of Glasses. Loved it. Thanks', 'avatar': 'https://ui-avatars.com/api/?name=Travel+Well&background=B4593F&color=fff', 'order': 4},
    {'name': 'Adarsh S', 'when': '8 months ago', 'rating': 5, 'text': 'Love how Wear the Hope reminds us that even our fashion can glorify God! Good vibes, better message, best quality.', 'avatar': 'https://ui-avatars.com/api/?name=Adarsh+S&background=5C3A22&color=fff', 'order': 5},
    {'name': 'John K', 'when': '8 months ago', 'rating': 5, 'text': 'We recently ordered these super cool flasks with our company logo & slogan printed for Diwali. The build quality was amazing. Value: 5/5. Quality: 5/5. Delivery: 5/5.', 'avatar': 'https://ui-avatars.com/api/?name=John+K&background=1A1A1A&color=fff', 'order': 6},
]

SEO_SEED = [
    {'path': '/', 'title': 'Wear The Hope | Biblical Gift Store — Faith Fashion & Personalized Gifts', 'description': 'Motivational faith-based gifts declaring the message of hope and love. Personalized T-shirts, wallets, mugs, tote bags, luggage tags, wall frames, and more. Ships worldwide.', 'keywords': 'biblical gifts, christian gifts india, wear the hope, faith tshirt, scripture wallet, personalized christian gifts, laser engraved wallet, christian merchandise'},
    {'path': '/shop', 'title': 'Shop All Faith Products | Wear The Hope', 'description': 'Explore our full collection of biblical gifts — drinkware, clothing, bags, boards, tags, caps, stickers, wall frames. Free shipping over ₹999.', 'keywords': 'christian shop, faith products, biblical merchandise, personalized christian gifts'},
    {'path': '/about', 'title': 'Our Story | Wear The Hope — A hobby that became a movement', 'description': 'Founded in 2018, Wear The Hope offers our "5 loaves and 2 fish" to God through faith-inspired products that impact lives.', 'keywords': 'wear the hope story, christian brand india, faith based business'},
    {'path': '/contact', 'title': 'Contact Us | Wear The Hope', 'description': 'Get in touch for bulk orders, custom designs and partnerships. Studio in Mumbai, India — ships worldwide.', 'keywords': 'contact wear the hope, bulk christian gifts, custom scripture products'},
]

COUPONS_SEED = [
    {'code': 'HOPE10', 'kind': 'percent', 'value': 10, 'min_subtotal': 500, 'max_discount': 500, 'active': True},
    {'code': 'FAITH20', 'kind': 'percent', 'value': 20, 'min_subtotal': 1500, 'max_discount': 1000, 'active': True},
    {'code': 'FLAT100', 'kind': 'flat', 'value': 100, 'min_subtotal': 799, 'active': True},
]


async def seed_all(db):
    """Idempotent seed — only inserts if collection empty."""
    # Categories
    if await db.categories.count_documents({}) == 0:
        docs = []
        for i, c in enumerate(CATEGORIES_SEED):
            docs.append({
                'id': f'cat_{i+1:02d}',
                'name': c['name'],
                'slug': c['slug'],
                'tagline': c.get('tagline', ''),
                'image': c.get('image', ''),
                'count': 0,
                'coming_soon': c.get('coming_soon', False),
                'order': c.get('order', i),
                'created_at': datetime.now(timezone.utc),
            })
        await db.categories.insert_many(docs)

    # Build slug -> id map
    cat_map = {}
    async for c in db.categories.find({}, {'_id': 0, 'id': 1, 'slug': 1}):
        cat_map[c['slug']] = c['id']

    # Products
    if await db.products.count_documents({}) == 0:
        pdocs = []
        for i, p in enumerate(PRODUCTS_SEED):
            pid = f'p_{i+1:03d}'
            sku_base = f'WTH-{p["slug"].upper()[:12].replace("-", "")}'
            product_doc = {
                'id': pid,
                'slug': p['slug'],
                'name': p['name'],
                'category': cat_map.get(p['cat_slug'], ''),
                'collections': [],
                'price': p['price'],
                'original_price': p['original_price'],
                'image': p['image'],
                'hover_image': p.get('hover_image'),
                'gallery': [p.get('hover_image')] if p.get('hover_image') else [],
                'videos': [],
                'verse': p.get('verse', ''),
                'tag': p.get('tag', ''),
                'ribbon': None,
                'rating': p.get('rating', 4.8),
                'reviews': p.get('reviews', 0),
                'colors': p.get('colors', []),
                'description': p.get('description', ''),
                'stock': 100,
                'sku': sku_base,
                'active': True,
                'product_type': 'physical',
                'digital_file_url': None,
                'weight_grams': 500,
                'personalization_enabled': False,
                'personalization_label': 'Personalize (optional)',
                'personalization_max_length': 40,
                'variant_options': [],
                'variants': [],
                'seo_title': None,
                'seo_description': None,
                'seo_keywords': None,
                'created_at': datetime.now(timezone.utc),
            }
            # Ribbons for common tags
            tag = (p.get('tag') or '').lower()
            if 'bestseller' in tag:
                product_doc['ribbon'] = 'Best Seller'
            elif tag == 'new':
                product_doc['ribbon'] = 'New'
            elif tag == 'trending':
                product_doc['ribbon'] = 'Trending'
            elif tag == 'signature':
                product_doc['ribbon'] = 'Signature'

            # Personalization on customizable products
            if p['slug'] in ('scripture-wallet', 'wood-keychain', 'scripture-pen-stand', 'god-will-make-way-tag'):
                product_doc['personalization_enabled'] = True
                product_doc['personalization_label'] = 'Engrave name / short verse'

            # Variants: T-shirt has sizes; Cap has color options
            if p['slug'] == 'psalm-46-tee':
                product_doc['variant_options'] = [{'name': 'Size', 'values': ['S', 'M', 'L', 'XL']}]
                product_doc['variants'] = [
                    {'id': f'v_{pid}_S', 'attrs': {'Size': 'S'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 15, 'sku': f'{sku_base}-S', 'image': p['image']},
                    {'id': f'v_{pid}_M', 'attrs': {'Size': 'M'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 25, 'sku': f'{sku_base}-M', 'image': p['image']},
                    {'id': f'v_{pid}_L', 'attrs': {'Size': 'L'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 20, 'sku': f'{sku_base}-L', 'image': p['image']},
                    {'id': f'v_{pid}_XL', 'attrs': {'Size': 'XL'}, 'price': p['price'] + 100, 'original_price': p['original_price'] + 100, 'stock': 10, 'sku': f'{sku_base}-XL', 'image': p['image']},
                ]
            elif p['slug'] == 'faith-cap-blessed':
                product_doc['variant_options'] = [{'name': 'Color', 'values': ['Navy', 'Black', 'Charcoal']}]
                product_doc['variants'] = [
                    {'id': f'v_{pid}_navy', 'attrs': {'Color': 'Navy'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 30, 'sku': f'{sku_base}-NVY', 'image': p['image']},
                    {'id': f'v_{pid}_black', 'attrs': {'Color': 'Black'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 30, 'sku': f'{sku_base}-BLK', 'image': p['image']},
                    {'id': f'v_{pid}_charcoal', 'attrs': {'Color': 'Charcoal'}, 'price': p['price'], 'original_price': p['original_price'], 'stock': 20, 'sku': f'{sku_base}-CHR', 'image': p['image']},
                ]
            pdocs.append(product_doc)
        await db.products.insert_many(pdocs)

    # Reviews
    if await db.reviews.count_documents({}) == 0:
        rdocs = []
        for i, r in enumerate(REVIEWS_SEED):
            rdocs.append({
                'id': f'r_{i+1:03d}',
                'name': r['name'],
                'rating': r['rating'],
                'text': r['text'],
                'when': r['when'],
                'avatar': r.get('avatar'),
                'source': 'Google',
                'published': True,
                'order': r.get('order', i),
                'created_at': datetime.now(timezone.utc),
            })
        await db.reviews.insert_many(rdocs)

    # SEO
    if await db.seo_meta.count_documents({}) == 0:
        sdocs = []
        for i, s in enumerate(SEO_SEED):
            sdocs.append({
                'id': f'seo_{i+1:03d}',
                'path': s['path'],
                'title': s['title'],
                'description': s['description'],
                'keywords': s.get('keywords'),
                'og_image': None,
                'canonical': None,
                'robots': 'index,follow',
                'updated_at': datetime.now(timezone.utc),
            })
        await db.seo_meta.insert_many(sdocs)

    # Coupons
    if await db.coupons.count_documents({}) == 0:
        cdocs = []
        for i, c in enumerate(COUPONS_SEED):
            cdocs.append({
                'id': f'c_{i+1:03d}',
                'code': c['code'].upper(),
                'kind': c['kind'],
                'value': c['value'],
                'min_subtotal': c.get('min_subtotal', 0),
                'max_discount': c.get('max_discount'),
                'expires_at': None,
                'usage_limit': None,
                'used_count': 0,
                'active': c.get('active', True),
                'created_at': datetime.now(timezone.utc),
            })
        await db.coupons.insert_many(cdocs)

    # Ensure product counts on categories
    for slug, cid in cat_map.items():
        n = await db.products.count_documents({'category': cid, 'active': True})
        await db.categories.update_one({'id': cid}, {'$set': {'count': n}})

    # Migration: back-fill new Phase A fields onto existing products
    async for p in db.products.find({}, {'_id': 0}):
        updates = {}
        if 'sku' not in p or not p.get('sku'):
            updates['sku'] = f'WTH-{p["slug"].upper()[:12].replace("-", "")}'
        for field, default in [
            ('collections', []), ('gallery', [p.get('hover_image')] if p.get('hover_image') else []),
            ('videos', []), ('ribbon', None),
            ('product_type', 'physical'), ('digital_file_url', None), ('weight_grams', 500),
            ('personalization_enabled', False),
            ('personalization_label', 'Personalize (optional)'),
            ('personalization_max_length', 40),
            ('variant_options', []), ('variants', []),
        ]:
            if field not in p:
                updates[field] = default
        if updates:
            await db.products.update_one({'id': p['id']}, {'$set': updates})

    # One-time: seed variants for tee + cap if empty
    tee = await db.products.find_one({'slug': 'psalm-46-tee'}, {'_id': 0, 'id': 1, 'variants': 1, 'price': 1, 'original_price': 1, 'image': 1, 'sku': 1})
    if tee and not tee.get('variants'):
        pid = tee['id']
        sku_base = tee.get('sku') or f'WTH-{pid.upper()}'
        variants = [
            {'id': f'v_{pid}_S', 'attrs': {'Size': 'S'}, 'price': tee['price'], 'original_price': tee['original_price'], 'stock': 15, 'sku': f'{sku_base}-S', 'image': tee['image']},
            {'id': f'v_{pid}_M', 'attrs': {'Size': 'M'}, 'price': tee['price'], 'original_price': tee['original_price'], 'stock': 25, 'sku': f'{sku_base}-M', 'image': tee['image']},
            {'id': f'v_{pid}_L', 'attrs': {'Size': 'L'}, 'price': tee['price'], 'original_price': tee['original_price'], 'stock': 20, 'sku': f'{sku_base}-L', 'image': tee['image']},
            {'id': f'v_{pid}_XL', 'attrs': {'Size': 'XL'}, 'price': tee['price'] + 100, 'original_price': tee['original_price'] + 100, 'stock': 10, 'sku': f'{sku_base}-XL', 'image': tee['image']},
        ]
        await db.products.update_one({'id': pid}, {'$set': {'variant_options': [{'name': 'Size', 'values': ['S','M','L','XL']}], 'variants': variants}})

    cap = await db.products.find_one({'slug': 'faith-cap-blessed'}, {'_id': 0, 'id': 1, 'variants': 1, 'price': 1, 'original_price': 1, 'image': 1, 'sku': 1})
    if cap and not cap.get('variants'):
        pid = cap['id']
        sku_base = cap.get('sku') or f'WTH-{pid.upper()}'
        variants = [
            {'id': f'v_{pid}_navy', 'attrs': {'Color': 'Navy'}, 'price': cap['price'], 'original_price': cap['original_price'], 'stock': 30, 'sku': f'{sku_base}-NVY', 'image': cap['image']},
            {'id': f'v_{pid}_black', 'attrs': {'Color': 'Black'}, 'price': cap['price'], 'original_price': cap['original_price'], 'stock': 30, 'sku': f'{sku_base}-BLK', 'image': cap['image']},
            {'id': f'v_{pid}_charcoal', 'attrs': {'Color': 'Charcoal'}, 'price': cap['price'], 'original_price': cap['original_price'], 'stock': 20, 'sku': f'{sku_base}-CHR', 'image': cap['image']},
        ]
        await db.products.update_one({'id': pid}, {'$set': {'variant_options': [{'name': 'Color', 'values': ['Navy','Black','Charcoal']}], 'variants': variants}})

    # Enable personalization on customizable products
    for slug in ('scripture-wallet', 'wood-keychain', 'scripture-pen-stand', 'god-will-make-way-tag'):
        await db.products.update_one({'slug': slug}, {'$set': {'personalization_enabled': True, 'personalization_label': 'Engrave name / short verse'}})

    # Set ribbons based on tags
    tag_to_ribbon = {'Bestseller': 'Best Seller', 'New': 'New', 'Trending': 'Trending', 'Signature': 'Signature', 'Festive': 'Sale'}
    for tag, ribbon in tag_to_ribbon.items():
        await db.products.update_many({'tag': tag, 'ribbon': None}, {'$set': {'ribbon': ribbon}})

    # Seed default shipping rules
    if await db.shipping_rules.count_documents({}) == 0:
        rules = [
            {'id': 'sr_01', 'name': 'Standard Shipping', 'kind': 'flat', 'price': 99, 'min_subtotal': 0, 'eta_days': '3-5', 'states': [], 'pincodes': [], 'active': True, 'order': 1},
            {'id': 'sr_02', 'name': 'Free Shipping (orders ₹999+)', 'kind': 'free', 'price': 0, 'min_subtotal': 999, 'eta_days': '3-5', 'states': [], 'pincodes': [], 'active': True, 'order': 2},
            {'id': 'sr_03', 'name': 'Express (BlueDart)', 'kind': 'express', 'price': 199, 'min_subtotal': 0, 'eta_days': '1-2', 'states': [], 'pincodes': [], 'active': True, 'order': 3},
            {'id': 'sr_04', 'name': 'Local Pickup — Mumbai Studio', 'kind': 'pickup', 'price': 0, 'min_subtotal': 0, 'eta_days': '0', 'pickup_address': 'Wear The Hope Studio, Bandra West, Mumbai 400050', 'states': ['Maharashtra'], 'pincodes': [], 'active': True, 'order': 4},
        ]
        for r in rules:
            r['created_at'] = datetime.now(timezone.utc)
        await db.shipping_rules.insert_many(rules)

    # Seed default tax rates (India GST slabs)
    if await db.tax_rates.count_documents({}) == 0:
        rates = [
            {'id': 'tx_01', 'name': 'GST 5%', 'percent': 5.0, 'scope': 'all', 'category_id': None, 'active': False, 'order': 1},
            {'id': 'tx_02', 'name': 'GST 12%', 'percent': 12.0, 'scope': 'all', 'category_id': None, 'active': True, 'order': 2},
            {'id': 'tx_03', 'name': 'GST 18%', 'percent': 18.0, 'scope': 'all', 'category_id': None, 'active': False, 'order': 3},
        ]
        for t in rates:
            t['created_at'] = datetime.now(timezone.utc)
        await db.tax_rates.insert_many(rates)

    # Sample collections
    if await db.collections.count_documents({}) == 0:
        # gather product ids by tag
        bestsellers, new_arrivals, gift_ready = [], [], []
        async for p in db.products.find({}, {'_id': 0, 'id': 1, 'tag': 1, 'ribbon': 1}):
            t = ((p.get('tag') or '') + ' ' + (p.get('ribbon') or '')).lower()
            if 'bestseller' in t or 'best seller' in t:
                bestsellers.append(p['id'])
            if 'new' in t:
                new_arrivals.append(p['id'])
            if 'gift' in t or 'signature' in t or 'festive' in t:
                gift_ready.append(p['id'])
        cols = [
            {'name': 'Bestsellers', 'slug': 'bestsellers', 'tagline': 'Loved by thousands', 'description': 'Our most-loved faith gifts.', 'image': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800', 'product_ids': bestsellers, 'featured': True, 'order': 1},
            {'name': 'New Arrivals', 'slug': 'new-arrivals', 'tagline': 'Fresh drops this month', 'description': 'The latest additions to our collection.', 'image': 'https://images.unsplash.com/photo-1699465301322-362016624dd7?w=800', 'product_ids': new_arrivals, 'featured': True, 'order': 2},
            {'name': 'Gift Ready', 'slug': 'gift-ready', 'tagline': 'Perfect for every occasion', 'description': 'Curated gifts that arrive wrapped and ready.', 'image': 'https://images.unsplash.com/photo-1554230253-017daba2b631?w=800', 'product_ids': gift_ready, 'featured': True, 'order': 3},
        ]
        cdocs = []
        for i, c in enumerate(cols):
            cdocs.append({
                'id': f'col_{i+1:02d}', 'name': c['name'], 'slug': c['slug'],
                'tagline': c['tagline'], 'description': c['description'], 'image': c['image'],
                'product_ids': c['product_ids'], 'featured': c['featured'], 'active': True, 'order': c['order'],
                'seo_title': None, 'seo_description': None,
                'created_at': datetime.now(timezone.utc),
            })
        if cdocs:
            await db.collections.insert_many(cdocs)


    # ---------- Seed store locations (real Wear The Hope addresses) ----------
    if await db.locations.count_documents({}) == 0:
        locs = [
            {
                'id': 'loc_01', 'label': 'Design Center', 'name': 'Wear The Hope',
                'address_lines': ['Raheja Vihar', 'Chandivali Farm Road'],
                'city': 'Mumbai', 'state': 'Maharashtra', 'pincode': '400072', 'country': 'India',
                'phone': None, 'whatsapp': '+91 90043 73305', 'email': '2wearthehope@gmail.com',
                'hours': 'Mon–Sat, 10 AM – 7 PM IST',
                'map_url': 'https://maps.google.com/?q=Raheja+Vihar+Chandivali+Mumbai+400072',
                'lat': 19.1136, 'lng': 72.8944,
                'is_primary': True, 'active': True, 'order': 1,
                'created_at': datetime.now(timezone.utc),
            },
            {
                'id': 'loc_02', 'label': 'Registered Office', 'name': 'Wear The Hope · C/o yzarC Studio',
                'address_lines': ['VII 705, RECCAA Valley Road', 'Kakkanad P.O'],
                'city': 'Ernakulam', 'state': 'Kerala', 'pincode': '682030', 'country': 'India',
                'phone': None, 'whatsapp': '+91 90043 73305', 'email': '2wearthehope@gmail.com',
                'hours': 'Mon–Sat, 10 AM – 6 PM IST',
                'map_url': 'https://maps.google.com/?q=Kakkanad+Ernakulam+Kerala+682030',
                'lat': 10.0159, 'lng': 76.3419,
                'is_primary': False, 'active': True, 'order': 2,
                'created_at': datetime.now(timezone.utc),
            },
        ]
        await db.locations.insert_many(locs)


    # ---------- Seed blog posts ----------
    if await db.blog_posts.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        posts = [
            {
                'id': 'bp_01', 'slug': 'the-story-of-hope',
                'title': 'The story behind Wear The Hope',
                'excerpt': 'How a small hobby project in December 2018 grew into a message of hope carried on every product.',
                'content': "<p>In December 2018, we launched a small idea — to offer our \"5 loaves and 2 fish\" to God. What began as a hobby has grown into a brand that carries messages of hope, faith, and love on wearables, drinkware and homeware.</p><p>Every product is a small reminder that you are chosen, loved, and favoured.</p><h2>Our vision</h2><p>To create motivational products that impact lives across nations. We ship worldwide, but our roots stay in Mumbai and Ernakulam.</p>",
                'cover_image': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200',
                'author': 'The WTH Team', 'author_avatar': None,
                'tags': ['story', 'brand'], 'published': True, 'featured': True, 'read_minutes': 4,
                'seo_title': 'The Story Behind Wear The Hope',
                'seo_description': 'From a small hobby project in 2018 to a global message of hope on every product.',
                'published_at': now, 'created_at': now, 'updated_at': now,
            },
            {
                'id': 'bp_02', 'slug': 'gifting-with-purpose',
                'title': 'Gifting with purpose: 5 ideas that speak faith',
                'excerpt': 'From engraved wallets to Christmas glass sets — thoughtful gifts that carry the message beyond the box.',
                'content': "<p>Gifts that make a person pause and smile are the ones that carry meaning. Here are our 5 most-loved picks for meaningful gifting.</p><ol><li>Personalised Scripture Wallet</li><li>Faith Cap – Blessed</li><li>Christmas Borosil Glass Set</li><li>Wood Carved Custom Keychain</li><li>Scripture Pen Stand</li></ol><p>Order early for festive delivery — we ship pan-India in 3–5 days.</p>",
                'cover_image': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200',
                'author': 'The WTH Team', 'tags': ['gifting', 'guide'],
                'published': True, 'featured': False, 'read_minutes': 3,
                'seo_title': 'Gifting with purpose — 5 faith-filled picks',
                'seo_description': '5 thoughtful, faith-filled gift ideas from Wear The Hope.',
                'published_at': now - timedelta(days=6),
                'created_at': now - timedelta(days=6),
                'updated_at': now,
            },
            {
                'id': 'bp_03', 'slug': 'behind-the-cold-burn-tech',
                'title': 'Behind the "Cold Burn Tech" wood keychains',
                'excerpt': 'A peek into the craft that lets us engrave your name onto walnut without smoke, char, or the shakes.',
                'content': "<p>Traditional wood engraving heats the wood until it burns — leaving char, smoke and irregular edges. Our Cold Burn technique lifts the ink with UV curing instead, producing crisp, high-contrast art at scale.</p><p>The result? Ultra-fine detail on couple names, initials and even short verses. Every keychain feels intentional.</p>",
                'cover_image': 'https://images.unsplash.com/photo-1609587415882-97552f39c6c2?w=1200',
                'author': 'The WTH Team', 'tags': ['craft', 'behind-the-scenes'],
                'published': True, 'featured': False, 'read_minutes': 5,
                'seo_title': 'Behind the Cold Burn keychain tech',
                'seo_description': 'How we engrave crisp keychains without smoke or char.',
                'published_at': now - timedelta(days=14),
                'created_at': now - timedelta(days=14),
                'updated_at': now,
            },
        ]
        await db.blog_posts.insert_many(posts)

    # ---------- Seed Instagram feed (curated / mocked) ----------
    if await db.instagram_posts.count_documents({}) == 0:
        # Fetch products so we can attach shoppable tags
        prods = await db.products.find({}, {'_id': 0, 'id': 1, 'slug': 1}).to_list(50)
        pmap = {p['slug']: p['id'] for p in prods}
        ig = [
            {'id': 'ig_01', 'caption': 'Personalised wallets that speak faith. DM to customise.',
             'image': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 342, 'comments': 24,
             'product_ids': [pmap['scripture-wallet']] if 'scripture-wallet' in pmap else [],
             'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
            {'id': 'ig_02', 'caption': 'BLESSED. SIMPLY BLESSED. CHOSEN — the Faith Cap collection is here.',
             'image': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 512, 'comments': 41,
             'product_ids': [pmap['faith-cap-blessed']] if 'faith-cap-blessed' in pmap else [],
             'active': True, 'order': 2, 'created_at': datetime.now(timezone.utc)},
            {'id': 'ig_03', 'caption': 'Christmas glass set — pan-India shipping. Order now.',
             'image': 'https://images.unsplash.com/photo-1643946404043-178456b0e3f8?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 289, 'comments': 18,
             'product_ids': [pmap['borosil-christmas-set']] if 'borosil-christmas-set' in pmap else [],
             'active': True, 'order': 3, 'created_at': datetime.now(timezone.utc)},
            {'id': 'ig_04', 'caption': 'Psalm 46 — through every storm, God is our refuge.',
             'image': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 428, 'comments': 32,
             'product_ids': [pmap['psalm-46-tee']] if 'psalm-46-tee' in pmap else [],
             'active': True, 'order': 4, 'created_at': datetime.now(timezone.utc)},
            {'id': 'ig_05', 'caption': 'YHWH — the most holy name, in minimalist calligraphy.',
             'image': 'https://images.unsplash.com/photo-1699465301322-362016624dd7?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 356, 'comments': 22,
             'product_ids': [pmap['yhwh-canvas-frame']] if 'yhwh-canvas-frame' in pmap else [],
             'active': True, 'order': 5, 'created_at': datetime.now(timezone.utc)},
            {'id': 'ig_06', 'caption': 'Wood keychains, Cold Burn Tech — DM +91 9004373305.',
             'image': 'https://images.unsplash.com/photo-1609587415882-97552f39c6c2?w=800',
             'permalink': 'https://www.instagram.com/wearthehope/', 'likes': 231, 'comments': 15,
             'product_ids': [pmap['wood-keychain']] if 'wood-keychain' in pmap else [],
             'active': True, 'order': 6, 'created_at': datetime.now(timezone.utc)},
        ]
        await db.instagram_posts.insert_many(ig)
