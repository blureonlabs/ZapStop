# Fresh Deployment Guide for ZapStop

## Overview
This guide will help you deploy ZapStop from scratch to both Render (backend) and Netlify (frontend).

## Prerequisites
- GitHub repository with code pushed
- Render account
- Netlify account
- Neon PostgreSQL database (or any PostgreSQL database)

## Step 1: Backend Deployment (Render)

### 1.1 Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `dev-render` branch
5. Configure the service:

**Basic Settings:**
- Name: `zapstop-backend`
- Environment: `Python 3`
- Region: `Oregon (US West)`
- Branch: `dev-render`
- Root Directory: `backend`

**Build & Deploy:**
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 1.2 Environment Variables
Set these in Render dashboard under "Environment":

**Required:**
```
DATABASE_URL=postgresql://username:password@your-neon-host:5432/zapstop
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
ALLOWED_ORIGINS=https://zapstop.netlify.app,https://zapstop-app.netlify.app,http://localhost:3000
ENVIRONMENT=production
DEBUG=false
```

**Optional:**
```
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
RESEND_API_KEY=your-resend-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

### 1.3 Deploy
1. Click "Create Web Service"
2. Wait for build to complete
3. Note the service URL (e.g., `https://zapstop-backend.onrender.com`)

## Step 2: Frontend Deployment (Netlify)

### 2.1 Create Netlify Site
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Select the `dev-render` branch

### 2.2 Build Settings
- Build command: `npm run build`
- Publish directory: `out`
- Node version: `18`

### 2.3 Environment Variables
Set these in Netlify dashboard under "Site settings" → "Environment variables":

```
NEXT_PUBLIC_API_URL=https://zapstop-backend.onrender.com
NODE_ENV=production
```

### 2.4 Deploy
1. Click "Deploy site"
2. Wait for build to complete
3. Note the site URL (e.g., `https://zapstop.netlify.app`)

## Step 3: Update CORS Settings

After both deployments are complete:

1. Go back to Render dashboard
2. Update the `ALLOWED_ORIGINS` environment variable to include your actual Netlify URL
3. Redeploy the backend service

## Step 4: Test the Deployment

### 4.1 Test Backend
Visit: `https://zapstop-backend.onrender.com/docs`
- Should show FastAPI documentation
- Test the `/health` endpoint

### 4.2 Test Frontend
Visit: `https://zapstop.netlify.app`
- Should load the login page
- Test navigation to dashboard

### 4.3 Test Integration
1. Try logging in
2. Check if API calls work
3. Verify data loads correctly

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Update `ALLOWED_ORIGINS` in Render
   - Ensure frontend URL is included

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible from Render

3. **Build Failures**
   - Check build logs in both platforms
   - Ensure all dependencies are in requirements.txt

4. **Environment Variable Issues**
   - Verify all required variables are set
   - Check variable names match exactly

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure SSL certificates
3. Set up monitoring and logging
4. Create admin user in the system
5. Test all functionality end-to-end

## Support

If you encounter issues:
1. Check the build logs in Render/Netlify
2. Verify environment variables are set correctly
3. Test API endpoints directly
4. Check browser console for frontend errors
