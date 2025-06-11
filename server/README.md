# LiveStream App - Backend Server

Backend server for the LiveStream application providing WebRTC signaling, real-time chat, user authentication, and religious citation search functionality.

## 🚀 Features

- **WebRTC Signaling**: Socket.IO-based signaling for peer-to-peer connections
- **Real-time Chat**: Live messaging with emoji support
- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Religious Citations**: Search API for Quran, Bible, and Hadith
- **Stream Management**: Active stream tracking and viewer counts
- **MongoDB Integration**: User and video data persistence

## 🛠 Technologies

- **Node.js** + **Express.js** - Server framework
- **Socket.IO** - Real-time communication
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **node-fetch** - External API calls

## 📋 Prerequisites

- Node.js (v18+)
- MongoDB database
- npm or yarn

## 🚀 Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Environment Setup:**
```bash
cp env.example .env
```

3. **Configure environment variables:**
Edit `.env` with your values:
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
PORT=3001
```

## 🏃‍♂️ Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🌐 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login  
- `GET /api/profile` - Get user profile (protected)

### Videos
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos` - Add new video (protected)
- `GET /api/videos/categories` - Get video categories

### Religious Citations
- `GET /api/search/quran?query=term` - Search Quran
- `GET /api/search/bible?query=term` - Search Bible
- `GET /api/search/hadith?query=term` - Search Hadith

## 🔧 Socket.IO Events

### Client → Server
- `join-stream` - Join a stream as broadcaster/viewer
- `offer`, `answer`, `ice-candidate` - WebRTC signaling
- `chat-message` - Send chat message
- `leave-stream` - Leave current stream

### Server → Client
- `stream-joined` - Confirmation of stream join
- `new-viewer` - New viewer joined stream
- `viewer-left` - Viewer left stream
- `offer`, `answer`, `ice-candidate` - WebRTC signaling relay
- `chat-message` - Broadcast chat message
- `active-streams` - List of active streams

## 🚀 Railway Deployment

This server is configured for Railway deployment:

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial backend setup"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

2. **Deploy to Railway:**
- Connect your GitHub repository
- Railway will auto-detect the Node.js app
- Set environment variables in Railway dashboard
- Deploy automatically

### Required Environment Variables for Railway:
```
MONGODB_URI=your-mongodb-atlas-connection
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## 📁 Project Structure

```
server/
├── models/
│   ├── User.js          # User schema
│   └── Video.js         # Video schema
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── package.json         # Dependencies and scripts
├── index.js            # Main server file
├── .gitignore          # Git ignore rules
├── env.example         # Environment variables template
└── README.md           # This file
```

## 🔒 Security Features

- **CORS Protection**: Configurable origin restrictions
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Basic validation on all endpoints
- **Rate Limiting**: Memory-based limits on streams/users

## 🐛 Known Limitations

- In-memory storage for active streams (resets on restart)
- Basic rate limiting (consider Redis for production)
- Religious API dependencies on external services

## 📝 License

MIT License 