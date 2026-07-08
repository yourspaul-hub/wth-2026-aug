# Deployment Guide — Wear The Hope

Your app has **two pieces** that deploy to **different platforms**. This is the standard split for FastAPI + React apps.

## Why not everything on Vercel?

Vercel serverless is optimized for tiny stateless Python functions. Our FastAPI backend uses:

- Persistent MongoDB (Motor) connection pool
- Startup seeding + 15 MongoDB index creations
- GridFS binary streaming + Pillow image processing
- Heavy deps (`pandas`, `numpy`, `litellm`, `google-genai`, `openpyxl`, `boto3`)

Any one of those causes `FUNCTION_INVOCATION_FAILED / 500` on Vercel serverless. Use a **long-running Python host** for the backend instead.

---

## Recommended setup (all free tiers)

| Piece            | Platform                | Notes                                             |
|------------------|-------------------------|---------------------------------------------------|
| Frontend (React) | **Vercel**              | Static, CDN, auto-deploys from Git                |
| Backend (FastAPI)| **Render** or Railway   | Long-running web service, free 512 MB / 750 h    |
| Database (Mongo) | **MongoDB Atlas** M0    | Free 512 MB cluster, same region as backend       |

---

## Step 1 — Set up MongoDB Atlas (free)

1. Go to https://www.mongodb.com/atlas → sign up → create a **free M0 cluster** (pick a region close to your users, e.g. `AWS / ap-south-1` for India / Singapore for SE Asia).
2. **Database Access** → Add user (remember the password).
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`) — required for Render/Railway free tier.
4. **Connect** → Drivers → copy the connection string. Example:
   ```
   mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
5. Save this — you'll paste it into Render as `MONGO_URL`.

---

## Step 2 — Deploy backend to Render

1. Push this repo to GitHub (use Emergent's "Save to GitHub" button in the chat input).
2. Go to https://render.com → sign up with GitHub → **New +** → **Blueprint** → pick your repo.
3. Render will detect `render.yaml` at the repo root. Click **Apply**.
4. On the environment-variable prompt, set:
   - `MONGO_URL` = the Atlas connection string from step 1
   - `CORS_ORIGINS` = your Vercel frontend URL (e.g. `https://wearthehope.vercel.app` — comma-separated if you have staging too)
   - `PUBLIC_APP_URL` = same as `CORS_ORIGINS` (drives sitemap, invoice, review QR URLs)
5. Wait ~5 min for the first build. Copy the service URL Render gives you, e.g. `https://wearthehope-backend.onrender.com`.
6. Sanity check by opening `https://wearthehope-backend.onrender.com/api/content` — should return `{"items":{}}`.

> Free tier note: Render free web services **sleep after 15 min of inactivity** and take ~30 s to wake. For production, upgrade to the **$7/mo starter plan** (no sleep).

**Alternative: Railway** — same code works. Sign up at https://railway.app → new project → deploy from repo → set the same env vars → change start command to `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`.

---

## Step 3 — Configure the frontend on Vercel

1. In your Vercel project → **Settings** → **Environment Variables** → add:
   - `REACT_APP_BACKEND_URL` = the Render URL from step 2 (**no trailing slash**), e.g. `https://wearthehope-backend.onrender.com`
2. Redeploy the frontend (Deployments → click ⋯ → **Redeploy**).

> After this the flash-then-blank should be gone. The console will show `[api] REACT_APP_BACKEND_URL is not set` if you missed step 3.

---

## Step 4 — Verify

- Open your Vercel URL. Storefront should render.
- Open DevTools → **Network** tab → refresh. `/api/content`, `/api/products`, `/api/settings/public` should return `200` from your Render URL.
- Admin sign-in: `<vercel-url>/admin/login` → **Continue with Google** — should authenticate via the OAuth broker and redirect back to `/admin`.

---

## Troubleshooting

**Backend health check keeps failing on Render**
→ Check Render **Logs** tab. Most common cause: `MONGO_URL` wrong (Atlas password contains `@` or `/` — URL-encode it).

**CORS errors in browser**
→ `CORS_ORIGINS` on Render must exactly match your Vercel URL (including `https://`, no trailing slash). Restart the service after changing.

**Admin login redirects but doesn't complete**
→ The OAuth broker calls back to `<your-vercel-url>/admin/callback`. Ensure `PUBLIC_APP_URL` on Render matches your Vercel URL and the frontend has the correct `REACT_APP_BACKEND_URL`.

**"Cold start" 30 s wait on first request**
→ Render free tier behavior. Upgrade to the $7/mo starter for zero sleep, or ping the backend every 10 min from a free cron (e.g. https://cron-job.org).

**Images not loading**
→ Uploaded images are stored in GridFS inside MongoDB and served via `/api/images/{id}` — they should just work as long as MongoDB is reachable. To offload to a CDN, configure S3/CloudFront in the admin panel (Integrations → CDN).
