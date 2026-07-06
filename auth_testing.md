# Emergent Google Auth Testing Playbook (Wear The Hope Admin)

## Step 1: Create Test Admin User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'admin-test-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.admin_users.insertOne({
  user_id: userId,
  email: 'admin.test.' + Date.now() + '@example.com',
  name: 'Admin Test',
  picture: 'https://via.placeholder.com/150',
  role: 'admin',
  created_at: new Date()
});
db.admin_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Set cookie in Playwright & navigate to /admin
```js
await context.addCookies([{
  name: 'session_token',
  value: 'YOUR_SESSION_TOKEN',
  domain: 'your-preview-host',
  path: '/',
  httpOnly: true, secure: true, sameSite: 'None'
}]);
await page.goto('https://your-preview-host/admin');
```

## Success indicators
- /api/auth/me returns admin user
- /admin dashboard loads
- Can create/update coupons, reviews, products

## Failure indicators
- 401 unauthorized
- Redirect to /login
