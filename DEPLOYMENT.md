# 🚀 Deployment Guide - Vercel + Railway

This guide will help you deploy the LiveStream App with the frontend on Vercel and backend on Railway.

## 📋 Prerequisites

- **Vercel account** (free at vercel.com)
- **Railway account** (free at railway.app)
- **MongoDB Atlas account** (free at mongodb.com/atlas)
- **GitHub repository** (for both frontend and backend)

## 🗄️ Step 1: Setup MongoDB Atlas

1. **Create MongoDB Atlas cluster:**
   - Go to [MongoDB Atlas](https://mongodb.com/atlas)
   - Create a free cluster
   - Create a database user
   - Whitelist IP addresses (0.0.0.0/0 for Railway)
   - Get your connection string

2. **Connection string format:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/livestream-app?retryWrites=true&w=majority
   ```

## 🖥️ Step 2: Deploy Backend to Railway

### Option A: From Separate Repository (Recommended)

1. **Create new repository for backend:**
   ```bash
   # Copy server folder to new location
   cp -r server/ ../livestream-backend/
   cd ../livestream-backend/
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial backend setup"
   git remote add origin https://github.com/yourusername/livestream-backend.git
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your backend repository
   - Railway will auto-detect Node.js

3. **Set Environment Variables in Railway:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/livestream-app
   JWT_SECRET=your-super-secret-production-key-make-it-long-and-random
   NODE_ENV=production
   FRONTEND_URL=https://your-app-name.vercel.app
   ```

4. **Get Railway URL:**
   - After deployment, Railway will provide a URL like: `https://your-app.up.railway.app`
   - Save this URL for frontend configuration

### Option B: From Current Repository

1. **Deploy directly:**
   - Go to [Railway](https://railway.app)
   - Connect your current repository
   - Set root directory to `/server`
   - Configure environment variables as above

## 🌐 Step 3: Deploy Frontend to Vercel

1. **Configure environment variables:**
   Create `.env.local` file:
   ```env
   VITE_API_URL=https://your-railway-app.up.railway.app
   ```

2. **Deploy to Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Add environment variable: `VITE_API_URL=https://your-railway-app.up.railway.app`
   - Deploy

3. **Update Railway CORS:**
   After Vercel deployment, update Railway environment:
   ```
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

## 🔄 Step 4: Update Configuration

### Update Railway Backend CORS

In Railway dashboard, update `FRONTEND_URL` environment variable:
```
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```

### Verify Deployment

1. **Test API endpoints:**
   ```bash
   curl https://your-railway-app.up.railway.app/api/videos
   ```

2. **Test frontend:**
   - Visit your Vercel URL
   - Register/login should work
   - Stream creation should work

## 🔧 Step 5: Custom Domains (Optional)

### Vercel Custom Domain
1. Go to Vercel project settings
2. Add your custom domain
3. Configure DNS records

### Railway Custom Domain
1. Go to Railway project settings
2. Add custom domain
3. Update frontend environment variables

## 🚀 Quick Deploy Commands

### For Backend (Server folder as separate repo):
```bash
# Navigate to server folder
cd server/

# Initialize as separate repo
git init
git add .
git commit -m "Backend setup for Railway"

# Add remote and push
git remote add origin https://github.com/yourusername/livestream-backend.git
git push -u origin main

# Deploy on Railway by connecting the repo
```

### For Frontend:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts and set environment variables
```

## 🔍 Environment Variables Summary

### Railway (Backend):
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/livestream-app
JWT_SECRET=your-super-secret-production-key
NODE_ENV=production
FRONTEND_URL=https://your-vercel-app.vercel.app
PORT=3001
```

### Vercel (Frontend):
```env
VITE_API_URL=https://your-railway-app.up.railway.app
```

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Ensure `FRONTEND_URL` is set correctly in Railway
   - Check that Vercel URL matches exactly

2. **MongoDB Connection:**
   - Verify connection string format
   - Check IP whitelist (use 0.0.0.0/0 for Railway)
   - Ensure database user has read/write permissions

3. **WebRTC Issues:**
   - Both domains must use HTTPS (Vercel/Railway provide this)
   - Check browser console for WebRTC errors

4. **Socket.IO Connection:**
   - Verify API URL in frontend config
   - Check Railway logs for connection errors

## 📝 Production Checklist

- [ ] MongoDB Atlas cluster configured
- [ ] Railway backend deployed with all environment variables
- [ ] Vercel frontend deployed with API URL
- [ ] CORS properly configured
- [ ] Custom domains configured (if using)
- [ ] SSL certificates active (automatic with Vercel/Railway)
- [ ] Test user registration/login
- [ ] Test stream creation and viewing
- [ ] Test real-time chat functionality
- [ ] Test religious citation search

## 🔄 CI/CD Setup (Optional)

Both Vercel and Railway automatically deploy when you push to your main branch. No additional CI/CD setup required!

---

**🎉 Your LiveStream app is now live! Happy Debating!** 