# 🚀 ZapStop Deployment Guide - Neon + Netlify + Render Stack

## Overview

This guide will help you deploy ZapStop to production using:
- **Frontend**: Netlify (Static Site Hosting)
- **Backend**: Render (Python/FastAPI)
- **Database**: Neon (PostgreSQL)

## Prerequisites

1. **Neon Account**: [neon.tech](https://neon.tech) - Free PostgreSQL database
2. **Netlify Account**: [netlify.com](https://netlify.com) - Free static hosting
3. **Render Account**: [render.com](https://render.com) - Free backend hosting
4. **GitHub Repository**: Your code should be in a GitHub repo

## Step 1: Database Setup (Neon)

### 1.1 Create Neon Database
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (it will look like: `postgresql://username:password@host:5432/database`)

### 1.2 Set Up Database Schema
1. Connect to your Neon database using any PostgreSQL client
2. Run the SQL schema from `neon-complete-schema.sql` (if available)
3. Or create the tables manually using the backend models

## Step 2: Backend Deployment (Render)

### 2.1 Prepare Backend
1. Ensure your `backend/requirements.txt` includes all dependencies
2. Make sure `backend/render.yaml` is configured correctly

### 2.2 Deploy to Render
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `zapstop-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend`

### 2.3 Set Environment Variables in Render
In your Render service dashboard, add these environment variables:
```
DATABASE_URL=postgresql://username:password@your-neon-host:5432/zapstop
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app,http://localhost:3000
ENVIRONMENT=production
DEBUG=false
```

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://zapstop-backend.onrender.com`)

## Step 3: Frontend Deployment (Netlify)

### 3.1 Prepare Frontend
1. Ensure `netlify.toml` is configured correctly
2. Update `NEXT_PUBLIC_API_URL` in `netlify.toml` with your Render backend URL

### 3.2 Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "New site from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `out`
   - **Node version**: `18`

### 3.3 Set Environment Variables in Netlify
In your Netlify site dashboard:
1. Go to Site settings → Environment variables
2. Add: `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com`

### 3.4 Deploy
1. Click "Deploy site"
2. Wait for deployment to complete
3. Note your frontend URL (e.g., `https://zapstop-app.netlify.app`)

## Step 4: Update CORS Settings

### 4.1 Update Backend CORS
In your Render backend environment variables, update:
```
ALLOWED_ORIGINS=https://your-actual-netlify-url.netlify.app,http://localhost:3000
```

### 4.2 Redeploy Backend
Trigger a redeploy in Render to apply the new CORS settings.

## Step 5: Test Your Deployment

### 5.1 Test Backend
1. Visit `https://your-backend-url.onrender.com/api/health/`
2. Should return a health check response

### 5.2 Test Frontend
1. Visit your Netlify URL
2. Try logging in with test credentials
3. Verify all features work

## Step 6: Create Admin User

### 6.1 Using Backend API
You can create an admin user by calling the backend API directly:

```bash
curl -X POST "https://your-backend-url.onrender.com/api/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@zapstop.com",
    "password": "admin123",
    "role": "admin",
    "phone": "+1234567890"
  }'
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure `ALLOWED_ORIGINS` includes your Netlify URL
2. **Database Connection**: Verify `DATABASE_URL` is correct
3. **Build Failures**: Check build logs in Netlify/Render
4. **API Not Found**: Ensure backend is deployed and accessible

### Logs
- **Backend logs**: Available in Render dashboard
- **Frontend logs**: Available in Netlify dashboard
- **Database logs**: Available in Neon dashboard

## Production Checklist

- [ ] Database schema created
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Admin user created
- [ ] All features tested
- [ ] SSL certificates working (automatic with Netlify/Render)

## Cost

- **Neon**: Free tier (0.5GB storage, 10GB transfer)
- **Netlify**: Free tier (100GB bandwidth, 300 build minutes)
- **Render**: Free tier (750 hours/month, sleeps after 15min inactivity)

Total: **$0/month** for small to medium usage!

## Support

If you encounter issues:
1. Check the logs in each service dashboard
2. Verify all environment variables are set correctly
3. Ensure your GitHub repository is up to date
4. Check that all services are running and accessible