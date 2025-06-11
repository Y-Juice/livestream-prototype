# 🖥️ Backend Server Setup

This server folder is now completely self-contained and ready for deployment to Railway.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp env.example .env
   ```

3. **Configure .env:**
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-key
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Run server:**
   ```bash
   npm start       # Production
   npm run dev     # Development with auto-reload
   ```

## 📦 Included Files

- `package.json` - All necessary dependencies
- `index.js` - Main server file
- `models/` - Database schemas
- `middleware/` - Authentication middleware
- `.gitignore` - Git ignore rules
- `env.example` - Environment variables template
- `README.md` - Detailed documentation

## 🚀 Railway Deployment Ready

This folder can be deployed directly to Railway:
1. Create new GitHub repository from this folder
2. Connect to Railway
3. Set environment variables
4. Deploy automatically

See `../DEPLOYMENT.md` for complete deployment instructions. 