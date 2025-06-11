# LiveStream App - WebRTC Multi-Feature Streaming Platform

A comprehensive one-to-many livestreaming application built with React, TypeScript, and WebRTC. This application enables users to create and watch livestreams with advanced features including real-time chat, live transcription, and religious citation search functionality.

## 🚀 Features

### Core Streaming Features
- **Live Video Streaming**: Create livestreams using webcam and microphone
- **Real-time Viewing**: Watch livestreams with minimal latency using WebRTC
- **Stream Discovery**: Browse active streams on the homepage
- **Viewer Count**: Real-time viewer count display for each stream
- **User Authentication**: Account creation and login system

### Advanced Features
- **Live Chat**: Real-time messaging during streams with emoji support
- **Live Transcription**: Automatic speech-to-text transcription using Web Speech API
- **Religious Citation Search**: Search and insert citations from Quran, Bible, and Hadith
- **Responsive Design**: Optimized for desktop and mobile devices

### Chat Features
- Real-time messaging with Socket.IO
- Emoji picker integration
- Religious citation search and insertion
- Persistent chat history during stream session

## 🛠 Technologies Used

### Frontend
- **React 19** + **TypeScript** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing

### Backend
- **Express.js** - Node.js web framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Real-time Communication
- **WebRTC** - Peer-to-peer video streaming
- **Socket.IO** - Signaling server for WebRTC
- **Web Speech API** - Browser-based speech recognition

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type safety
- **Concurrently** - Run multiple scripts simultaneously

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** database (local or cloud)
- **Modern web browser** with WebRTC support (Chrome, Firefox, Safari, Edge)

## 🚀 Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/livestream-app.git
cd livestream-app
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Setup:**
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/livestream-app
JWT_SECRET=your-secret-key-here
PORT=3001
```

4. **Database Setup:**
- Ensure MongoDB is running on your system
- The application will automatically create the required collections

## 🏃‍♂️ Running the Application

### Development Mode (Recommended)
Run both frontend and backend simultaneously:
```bash
npm run dev:all
```

This command starts:
- Frontend development server on `http://localhost:5173`
- Backend server on `http://localhost:3001`

### Individual Services
**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run server
```

### Production Build
```bash
npm run build
npm start
```

## 📖 Usage Guide

### Getting Started
1. **Register/Login**: Create an account or login with existing credentials
2. **Browse Streams**: View active streams on the homepage
3. **Create Stream**: Click "Start Streaming" to begin broadcasting
4. **Watch Streams**: Click on any active stream to join as a viewer

### Streaming Features
- **Camera/Microphone**: Allow browser access when prompted
- **Live Transcription**: Toggle transcription to see speech-to-text
- **Chat Interaction**: Engage with viewers through real-time chat

### Chat Features
- **Send Messages**: Type and send messages to all viewers
- **Emoji Support**: Use the emoji picker for expressive communication
- **Religious Citations**: Search and insert citations from religious texts

### Religious Citation Search
- **Supported Texts**: Quran, Bible, and Hadith
- **Search Functionality**: Find relevant verses or passages
- **Easy Insertion**: Click to insert citations directly into chat

## 🏗 Project Structure

```
livestream-app/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── auth/                # Authentication components
│   │   ├── Chat.tsx             # Real-time chat component
│   │   ├── CreateStream.tsx     # Stream creation interface
│   │   ├── ViewStream.tsx       # Stream viewing interface
│   │   ├── Home.tsx             # Homepage with stream list
│   │   ├── Navbar.tsx           # Navigation component
│   │   ├── Transcription.tsx    # Live transcription feature
│   │   └── ReligiousCitationSearch.tsx # Citation search
│   ├── api/                     # API utilities
│   ├── App.tsx                  # Main application component
│   └── main.tsx                 # Application entry point
├── server/                      # Backend source code
│   ├── models/                  # Database models
│   │   └── User.js             # User model schema
│   ├── middleware/              # Express middleware
│   └── index.js                # Main server file
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # TailwindCSS configuration
└── tsconfig.json               # TypeScript configuration
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/verify` - Token verification

### Streaming
- `GET /streams` - Get active streams
- `POST /streams` - Create new stream
- `DELETE /streams/:id` - End stream

### Religious Citations
- `GET /api/search/quran` - Search Quran verses
- `GET /api/search/bible` - Search Bible passages
- `GET /api/search/hadith` - Search Hadith collections

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (default: 3001)

### Browser Permissions
The application requires:
- **Camera access** - For video streaming
- **Microphone access** - For audio streaming and transcription
- **Cookies** - For authentication persistence

## 🚧 Known Limitations

- **Browser Compatibility**: Live transcription requires Chrome or Edge
- **WebRTC Support**: Older browsers may not support all features
- **Religious API**: Bible and Hadith search have limited implementation
- **Mobile Experience**: Optimized for desktop use, mobile may have limitations

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for secure password storage
- **CORS Protection** - Configured for secure cross-origin requests
- **Input Validation** - Server-side validation for all inputs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License

## 🙏 Acknowledgements

- [WebRTC](https://webrtc.org/) - Real-time communication protocol
- [Socket.IO](https://socket.io/) - Real-time bidirectional event-based communication
- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## 📚 References & Learning Resources

- VideoSDK.live. (n.d.). How to build WebRTC React App?. https://www.videosdk.live/developer-hub/webrtc/webrtc-react
- Jain, B. (n.d.). WebRTC React: A Comprehensive Guide. Dev.to. https://dev.to/bhavyajain/webrtc-react-a-comprehensive-guide-2hdk
- Italt, E. (n.d.). Develop a Video Chat App with WebRTC, Socket.io, Express, and React. Dev.to. https://dev.to/eyitayoitalt/develop-a-video-chat-app-with-webrtc-socketio-express-and-react-3jc4
- Fireship. (2021, March 15). WebRTC in 100 Seconds // Build a Video Chat app from Scratch [Video]. YouTube. https://www.youtube.com/watch?v=WmR9IMUD_CY
- Coding with chaim. (2021, March 22). Socket IO Rooms Tutorial (Backend part 1) [Video]. YouTube. https://www.youtube.com/watch?v=NwHq1-FkQpU
- Web Dev Simplified. (25 jul 2020). How To Create A Video Chat App With WebRTC [Video]. YouTube. https://www.youtube.com/watch?v=DvlyzDZDEq4
- Web Dev Simplified. (1 jun 2019). Build Real Time Chat Rooms With Node.js And Socket.io [Video]. YouTube. https://www.youtube.com/watch?v=UymGJnv-WsE
- AssemblyAI. Transcribe streaming audio from a microphone. https://www.assemblyai.com/docs/getting-started/transcribe-streaming-audio-from-a-microphone/typescript
- AssemblyAI Node SDK Browser Compatibility. https://github.com/AssemblyAI/assemblyai-node-sdk/blob/main/docs/compat.md#browser-compatibility

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/livestream-app.git
cd livestream-app
npm install

# Start development servers
npm run dev:all

# Open browser to http://localhost:5173
```

**Happy Debating! 🎥✨**
