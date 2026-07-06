"""Seed initial products, categories, reviews from mock data."""
from datetime import datetime, timezone
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
            pdocs.append({
                'id': f'p_{i+1:03d}',
                'slug': p['slug'],
                'name': p['name'],
                'category': cat_map.get(p['cat_slug'], ''),
                'price': p['price'],
                'original_price': p['original_price'],
                'image': p['image'],
                'hover_image': p.get('hover_image'),
                'verse': p.get('verse', ''),
                'tag': p.get('tag', ''),
                'rating': p.get('rating', 4.8),
                'reviews': p.get('reviews', 0),
                'colors': p.get('colors', []),
                'description': p.get('description', ''),
                'stock': 100,
                'active': True,
                'seo_title': None,
                'seo_description': None,
                'seo_keywords': None,
                'created_at': datetime.now(timezone.utc),
            })
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
