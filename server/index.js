import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import auth from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/livestream-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Store active streams and users
const streams = new Map(); // streamId -> { broadcaster, viewers: Set<socketId> }
const users = new Map();   // socketId -> { username, streamId, role }

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ 
        error: 'Please provide all required fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }
    
    // Create new user
    const user = new User({ email, username, password });
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      user: { 
        email: user.email, 
        username: user.username 
      }, 
      token 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { 
        email: user.email, 
        username: user.username 
      }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

// Protected route example
app.get('/api/profile', auth, async (req, res) => {
  res.json({ 
    user: { 
      email: req.user.email, 
      username: req.user.username 
    } 
  });
});

// Function to log the current state of streams and users
const logState = () => {
  console.log('\n--- Current State ---');
  console.log('Active Streams:');
  streams.forEach((stream, streamId) => {
    console.log(`  Stream ${streamId} by ${stream.broadcaster}: ${stream.viewers.size} viewers`);
  });
  console.log(`Total Users: ${users.size}`);
  console.log('-------------------\n');
};

// Function to clean up disconnected users
const cleanupDisconnectedUsers = () => {
  console.log('Running cleanup for disconnected users...');
  
  // Get all connected socket IDs
  const connectedSocketIds = new Set(Array.from(io.sockets.sockets.keys()));
  
  // Find users that are no longer connected
  const disconnectedUsers = [];
  users.forEach((user, socketId) => {
    if (!connectedSocketIds.has(socketId)) {
      disconnectedUsers.push(socketId);
    }
  });
  
  // Remove disconnected users
  disconnectedUsers.forEach(socketId => {
    const user = users.get(socketId);
    if (user) {
      // If user was viewing a stream, remove them from viewers
      if (user.streamId && user.role === 'viewer') {
        const stream = streams.get(user.streamId);
        if (stream) {
          stream.viewers.delete(socketId);
          console.log(`Removed disconnected viewer ${user.username} from stream ${user.streamId}`);
          
          // Notify broadcaster of viewer count update
          const broadcasterSocket = Array.from(io.sockets.sockets.values())
            .find(socket => {
              const userData = users.get(socket.id);
              return userData && userData.streamId === user.streamId && userData.role === 'broadcaster';
            });
            
          if (broadcasterSocket) {
            broadcasterSocket.emit('viewer-count', { count: stream.viewers.size });
          }
        }
      }
      
      // If user was broadcasting, end the stream
      if (user.role === 'broadcaster' && user.streamId) {
        const stream = streams.get(user.streamId);
        if (stream) {
          // Notify all viewers that the stream has ended
          stream.viewers.forEach(viewerId => {
            const viewerSocket = io.sockets.sockets.get(viewerId);
            if (viewerSocket) {
              viewerSocket.emit('stream-ended');
            }
          });
          
          // Remove the stream
          streams.delete(user.streamId);
          console.log(`Removed stream ${user.streamId} from disconnected broadcaster ${user.username}`);
        }
      }
      
      // Remove the user
      users.delete(socketId);
      console.log(`Removed disconnected user ${user.username}`);
    }
  });
  
  if (disconnectedUsers.length > 0) {
    console.log(`Cleaned up ${disconnectedUsers.length} disconnected users`);
    logState();
  }
};

// Run cleanup every 30 seconds
setInterval(cleanupDisconnectedUsers, 30000);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Register user
  socket.on('register', ({ username }) => {
    users.set(socket.id, { username, role: null, streamId: null });
    console.log(`User registered: ${username} (${socket.id})`);
    
    // Send active streams to the user
    const activeStreams = Array.from(streams.entries()).map(([streamId, stream]) => ({
      streamId,
      broadcaster: stream.broadcaster,
      viewerCount: stream.viewers.size
    }));
    
    socket.emit('active-streams', activeStreams);
  });
  
  // Get active streams
  socket.on('get-active-streams', () => {
    const activeStreams = Array.from(streams.entries()).map(([streamId, stream]) => ({
      streamId,
      broadcaster: stream.broadcaster,
      viewerCount: stream.viewers.size
    }));
    
    socket.emit('active-streams', activeStreams);
  });
  
  // Start a stream
  socket.on('start-stream', ({ streamId }) => {
    const user = users.get(socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not registered' });
      return;
    }
    
    // Check if stream ID already exists
    if (streams.has(streamId)) {
      // If the same broadcaster is reconnecting to their stream
      const existingStream = streams.get(streamId);
      if (existingStream.broadcaster === user.username) {
        console.log(`Broadcaster ${user.username} reconnected to stream ${streamId}`);
        
        // Update user info
        user.role = 'broadcaster';
        user.streamId = streamId;
        
        // Notify broadcaster of current viewer count
        socket.emit('viewer-count', { count: existingStream.viewers.size });
        return;
      } else {
        socket.emit('error', { message: 'Stream ID already in use' });
        return;
      }
    }
    
    // Create new stream
    streams.set(streamId, {
      broadcaster: user.username,
      viewers: new Set()
    });
    
    // Update user info
    user.role = 'broadcaster';
    user.streamId = streamId;
    
    console.log(`Stream started: ${streamId} by ${user.username}`);
    logState();
    
    // Broadcast to all users that a new stream is available
    socket.broadcast.emit('new-stream', {
      streamId,
      broadcaster: user.username,
      viewerCount: 0
    });
  });
  
  // Join a stream
  socket.on('join-stream', ({ streamId, username }) => {
    // Check if stream exists
    if (!streams.has(streamId)) {
      socket.emit('stream-not-found');
      return;
    }
    
    const user = users.get(socket.id) || { username };
    
    // If not already registered, register the user
    if (!users.has(socket.id)) {
      users.set(socket.id, user);
    }
    
    // Get the stream
    const stream = streams.get(streamId);
    
    // Don't let broadcasters view their own stream
    if (user.username === stream.broadcaster) {
      socket.emit('error', { message: 'You cannot view your own stream' });
      return;
    }
    
    // Update user info
    user.role = 'viewer';
    user.streamId = streamId;
    
    // Add viewer to stream
    stream.viewers.add(socket.id);
    
    console.log(`User ${username} joined stream ${streamId}`);
    logState();
    
    // Find the broadcaster socket
    const broadcasterSocket = Array.from(io.sockets.sockets.values())
      .find(s => {
        const userData = users.get(s.id);
        return userData && userData.streamId === streamId && userData.role === 'broadcaster';
      });
    
    if (broadcasterSocket) {
      // Notify broadcaster of new viewer
      broadcasterSocket.emit('viewer-joined', { username });
      broadcasterSocket.emit('viewer-count', { count: stream.viewers.size });
      
      // Request an offer from the broadcaster
      broadcasterSocket.emit('request-offer', { target: socket.id });
    } else {
      // If broadcaster is not connected, remove the stream
      streams.delete(streamId);
      socket.emit('stream-not-found');
      console.log(`Stream ${streamId} removed because broadcaster is not connected`);
      logState();
    }
  });
  
  // Handle WebRTC signaling
  socket.on('offer', ({ target, offer }) => {
    const targetSocket = io.sockets.sockets.get(target);
    if (targetSocket) {
      targetSocket.emit('offer', { from: socket.id, offer });
    }
  });
  
  socket.on('answer', ({ target, answer }) => {
    const targetSocket = io.sockets.sockets.get(target);
    if (targetSocket) {
      targetSocket.emit('answer', { from: socket.id, answer });
    }
  });
  
  socket.on('ice-candidate', ({ target, candidate }) => {
    const targetSocket = io.sockets.sockets.get(target);
    if (targetSocket) {
      targetSocket.emit('ice-candidate', { from: socket.id, candidate });
    }
  });
  
  // Leave stream
  socket.on('leave-stream', () => {
    const user = users.get(socket.id);
    
    if (user && user.streamId) {
      if (user.role === 'viewer') {
        // Remove viewer from stream
        const stream = streams.get(user.streamId);
        if (stream) {
          stream.viewers.delete(socket.id);
          
          console.log(`User ${user.username} left stream ${user.streamId}`);
          logState();
          
          // Find the broadcaster socket
          const broadcasterSocket = Array.from(io.sockets.sockets.values())
            .find(s => {
              const userData = users.get(s.id);
              return userData && userData.streamId === user.streamId && userData.role === 'broadcaster';
            });
          
          if (broadcasterSocket) {
            // Notify broadcaster of viewer count update
            broadcasterSocket.emit('viewer-count', { count: stream.viewers.size });
          }
        }
      } else if (user.role === 'broadcaster') {
        // End the stream
        const stream = streams.get(user.streamId);
        if (stream) {
          // Notify all viewers that the stream has ended
          stream.viewers.forEach(viewerId => {
            const viewerSocket = io.sockets.sockets.get(viewerId);
            if (viewerSocket) {
              viewerSocket.emit('stream-ended');
            }
          });
          
          // Remove the stream
          streams.delete(user.streamId);
          
          console.log(`Stream ${user.streamId} ended by ${user.username}`);
          logState();
          
          // Broadcast to all users that the stream has ended
          socket.broadcast.emit('stream-ended', { streamId: user.streamId });
        }
      }
      
      // Reset user info
      user.role = null;
      user.streamId = null;
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      console.log(`User disconnected: ${user.username} (${socket.id})`);
      
      // Handle as if user left the stream
      if (user.streamId) {
        if (user.role === 'viewer') {
          // Remove viewer from stream
          const stream = streams.get(user.streamId);
          if (stream) {
            stream.viewers.delete(socket.id);
            
            // Find the broadcaster socket
            const broadcasterSocket = Array.from(io.sockets.sockets.values())
              .find(s => {
                const userData = users.get(s.id);
                return userData && userData.streamId === user.streamId && userData.role === 'broadcaster';
              });
            
            if (broadcasterSocket) {
              // Notify broadcaster of viewer count update
              broadcasterSocket.emit('viewer-count', { count: stream.viewers.size });
            }
          }
        } else if (user.role === 'broadcaster') {
          // End the stream
          const stream = streams.get(user.streamId);
          if (stream) {
            // Notify all viewers that the stream has ended
            stream.viewers.forEach(viewerId => {
              const viewerSocket = io.sockets.sockets.get(viewerId);
              if (viewerSocket) {
                viewerSocket.emit('stream-ended');
              }
            });
            
            // Remove the stream
            streams.delete(user.streamId);
            
            // Broadcast to all users that the stream has ended
            socket.broadcast.emit('stream-ended', { streamId: user.streamId });
          }
        }
      }
      
      // Remove the user
      users.delete(socket.id);
      logState();
    }
  });
});

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 