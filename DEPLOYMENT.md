# Deployment Guide - LifeMaxxing Royale

## Quick Deploy to Vercel (Easiest - ~5 minutes)

### Step 1: Push to GitHub (if not already)

```bash
# Initialize git if needed
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/lifemaxxing-royale.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login (free)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
6. Click "Deploy"

### Step 3: Update Supabase Settings

After deployment, you'll get a URL like `https://your-app.vercel.app`

1. Go to your Supabase project dashboard
2. Go to **Authentication > URL Configuration**
3. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

### That's it! Your app will be live at `https://your-app.vercel.app`

---

## Alternative: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "Add new site" > "Import an existing project"
3. Connect to GitHub and select your repo
4. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Add environment variables (same as Vercel)
6. Click "Deploy site"

---

## Alternative: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Next.js
5. Add environment variables in the Variables tab
6. Deploy!

---

## Troubleshooting

### Build Errors
- Make sure all dependencies are in `package.json`
- Run `npm run build` locally first to catch errors

### Environment Variables
- Double-check your Supabase URL and keys
- Make sure they're prefixed with `NEXT_PUBLIC_` for client-side access

### Database Issues
- Make sure you've run all SQL migrations in Supabase
- Check that RLS policies are set up correctly

