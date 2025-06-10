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
import fetch from 'node-fetch';
import Video from './models/Video.js';

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

// Store active streams and users - limit the size to avoid memory overflow
const streams = new Map(); // streamId -> { broadcaster, viewers: Set<socketId> }
const users = new Map();   // socketId -> { username, streamId, role }
// Store chat messages for each stream - limit the size to avoid memory overflow
const streamMessages = new Map(); // streamId -> Array<{username, message, timestamp}>

// Maximum number of streams and users to prevent memory issues
const MAX_STREAMS = 100;
const MAX_USERS = 200;
const MAX_MESSAGES_PER_STREAM = 50; // Reduced from 100 to 50 for memory optimization

app.use(cors({
  origin: '*', // In development, allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Religious Citation Search API routes
app.get('/api/search/quran', async (req, res) => {
  try {
    const { query, surah = 'all' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const url = `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/${surah}/en`;
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Error searching Quran:', error);
    res.status(500).json({ error: 'Failed to search Quran' });
  }
});

app.get('/api/search/hadith', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // This is a placeholder for actual Hadith API integration
    // You would need to implement the actual API call with proper authentication
    
    res.json({
      code: 200,
      data: {
        matches: [
          {
            text: "This is a placeholder for Hadith search results. The actual implementation would require proper API integration.",
            reference: "Example Hadith Reference",
            source: "Hadith"
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error searching Hadith:', error);
    res.status(500).json({ error: 'Failed to search Hadith' });
  }
});

app.get('/api/search/bible', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // This is a placeholder for actual Bible API integration
    // You would need to implement the actual API call with proper authentication and API key
    
    res.json({
      code: 200,
      data: {
        matches: [
          {
            text: "This is a placeholder for Bible search results. The actual implementation would require API key and authentication.",
            reference: "Example Bible Reference",
            source: "Bible"
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error searching Bible:', error);
    res.status(500).json({ error: 'Failed to search Bible' });
  }
});

// Video routes
app.get('/api/videos', async (req, res) => {
  try {
    const { category } = req.query;
    
    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }
    
    const videos = await Video.find(query)
      .sort({ _id: -1 }) // Sort by newest first (using _id since it contains timestamp)
      .limit(50); // Limit to 50 videos
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get single video by ID
app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json(video);
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

app.post('/api/videos', auth, async (req, res) => {
  try {
    const { category, channel_name, title, url } = req.body;

    // Validate required fields
    if (!category || !channel_name || !title || !url) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate YouTube URL format
    if (!url.includes('youtube.com/watch?v=')) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    // Check if video already exists
    const existingVideo = await Video.findOne({ url });
    if (existingVideo) {
      return res.status(400).json({ error: 'Video already exists' });
    }

    // Create new video
    const video = new Video({
      category,
      channel_name,
      title,
      url
    });

    await video.save();
    res.status(201).json(video);
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
});

// Get unique categories
app.get('/api/videos/categories', async (req, res) => {
  try {
    const categories = await Video.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Religious Sources API Routes
// Get all Quran data or search/filter
app.get('/api/quran', async (req, res) => {
  try {
    const { search, chapter, limit = 100 } = req.query;
    const collection = mongoose.connection.db.collection('quran');
    
    if (search) {
      // Search functionality
      const allData = await collection.findOne({});
      if (!allData) {
        return res.json([]);
      }
      
      const results = [];
      Object.keys(allData).forEach(chapterKey => {
        if (chapterKey !== '_id' && Array.isArray(allData[chapterKey])) {
          allData[chapterKey].forEach(verse => {
            if (verse.text && verse.text.toLowerCase().includes(search.toLowerCase())) {
              results.push(verse);
            }
          });
        }
      });
      
      res.json(results.slice(0, parseInt(limit)));
      return;
    }
    
    if (chapter) {
      // Get specific chapter
      const allData = await collection.findOne({});
      if (!allData || !allData[chapter]) {
        return res.json([]);
      }
      
      res.json(allData[chapter]);
      return;
    }
    
    // Get all chapters overview (for sidebar)
    const allData = await collection.findOne({});
    if (!allData) {
      return res.json([]);
    }
    
    const chapters = [];
    Object.keys(allData).forEach(key => {
      if (key !== '_id' && Array.isArray(allData[key])) {
        chapters.push({
          _id: key,
          number: parseInt(key),
          name: `Surah ${key}`,
          verses: allData[key].length
        });
      }
    });
    
    res.json(chapters.sort((a, b) => a.number - b.number));
  } catch (error) {
    console.error('Error fetching Quran:', error);
    res.status(500).json({ error: 'Failed to fetch Quran data' });
  }
});

// Get Quran chapters list
app.get('/api/quran/chapters', async (req, res) => {
  try {
    const collection = mongoose.connection.db.collection('quran');
    const allData = await collection.findOne({});
    
    if (!allData) {
      return res.json([]);
    }
    
    const chapters = [];
    Object.keys(allData).forEach(key => {
      if (key !== '_id' && Array.isArray(allData[key])) {
        chapters.push({
          _id: key,
          number: parseInt(key),
          name: `Surah ${key}`,
          verses: allData[key].length
        });
      }
    });
    
    res.json(chapters.sort((a, b) => a.number - b.number));
  } catch (error) {
    console.error('Error fetching Quran chapters:', error);
    res.status(500).json({ error: 'Failed to fetch Quran chapters' });
  }
});

// Get specific Quran chapter
app.get('/api/quran/chapter/:number', async (req, res) => {
  try {
    const chapterNumber = req.params.number;
    const collection = mongoose.connection.db.collection('quran');
    const allData = await collection.findOne({});
    
    if (!allData || !allData[chapterNumber]) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(allData[chapterNumber]);
  } catch (error) {
    console.error('Error fetching Quran chapter:', error);
    res.status(500).json({ error: 'Failed to fetch Quran chapter' });
  }
});

// Get all Bible data or search/filter
app.get('/api/bible', async (req, res) => {
  try {
    const { search, book, limit = 100 } = req.query;
    const collection = mongoose.connection.db.collection('bible');
    
    let results = [];
    
    if (search) {
      // Search within all chapters and verses
      const allBooks = await collection.find({}).toArray();
      
      allBooks.forEach(bookData => {
        if (bookData.chapters && Array.isArray(bookData.chapters)) {
          bookData.chapters.forEach((chapter, chapterIndex) => {
            if (Array.isArray(chapter)) {
              chapter.forEach((verse, verseIndex) => {
                if (verse && typeof verse === 'string' && verse.toLowerCase().includes(search.toLowerCase())) {
                  results.push({
                    _id: `${bookData._id}-${chapterIndex + 1}-${verseIndex + 1}`,
                    book: bookData.name,
                    text: verse,
                    chapter: chapterIndex + 1,
                    verse: verseIndex + 1
                  });
                }
              });
            }
          });
        }
      });
      
      results = results.slice(0, parseInt(limit));
    } else if (book) {
      // Get specific book with all its chapters
      const bookData = await collection.findOne({ 
        $or: [
          { abbrev: book },
          { name: book }
        ]
      });
      
      if (bookData) {
        // Return the complete book data for frontend processing
        results = bookData;
      }
    } else {
      // Get all books overview
      const allBooks = await collection.find({}).limit(parseInt(limit)).toArray();
      results = allBooks.map(book => ({
        _id: book._id,
        name: book.name,
        abbrev: book.abbrev,
        chapters: book.chapters || []
      }));
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching Bible:', error);
    res.status(500).json({ error: 'Failed to fetch Bible data' });
  }
});

// Get all Hadith data or search/filter
app.get('/api/hadith', async (req, res) => {
  try {
    const { search, collection: collectionParam, limit = 100 } = req.query;
    const collection = mongoose.connection.db.collection('hadith');
    
    let query = {};
    let results = [];
    
    if (search) {
      // Search in hadith chapters
      query = {
        $or: [
          { 'chapters.arabic': { $regex: search, $options: 'i' } },
          { 'chapters.english': { $regex: search, $options: 'i' } }
        ]
      };
      
      const hadithBooks = await collection.find(query).limit(parseInt(limit)).toArray();
      
      hadithBooks.forEach(book => {
        if (book.chapters && Array.isArray(book.chapters)) {
          book.chapters.forEach(chapter => {
            if ((chapter.arabic && chapter.arabic.toLowerCase().includes(search.toLowerCase())) ||
                (chapter.english && chapter.english.toLowerCase().includes(search.toLowerCase()))) {
              results.push({
                _id: chapter.id || chapter._id,
                collection: book.id,
                collection_name: book.metadata?.english?.title || book.metadata?.arabic?.title,
                hadith_number: chapter.id,
                text: chapter.english,
                arabic: chapter.arabic,
                bookId: chapter.bookId
              });
            }
          });
        }
      });
    } else if (collectionParam) {
      // Get specific hadith collection
      const hadithBook = await collection.findOne({ id: parseInt(collectionParam) });
      if (hadithBook && hadithBook.chapters) {
        results = hadithBook.chapters.map(chapter => ({
          _id: chapter.id || chapter._id,
          collection: hadithBook.id,
          collection_name: hadithBook.metadata?.english?.title || hadithBook.metadata?.arabic?.title,
          hadith_number: chapter.id,
          text: chapter.english,
          arabic: chapter.arabic,
          bookId: chapter.bookId
        }));
      }
    } else {
      // Get all hadith collections overview
      const allCollections = await collection.find({}).limit(parseInt(limit)).toArray();
      results = allCollections.map(book => ({
        _id: book._id,
        number: book.id,
        name: book.metadata?.english?.title || book.metadata?.arabic?.title || `Collection ${book.id}`,
        hadiths: book.chapters ? book.chapters.length : 0,
        length: book.metadata?.length || 0
      }));
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching Hadith:', error);
    res.status(500).json({ error: 'Failed to fetch Hadith data' });
  }
});

// Helper function to enforce limits
const enforceLimits = () => {
  // Limit the number of active streams
  if (streams.size > MAX_STREAMS) {
    console.log(`Enforcing stream limit: ${streams.size} streams, max allowed is ${MAX_STREAMS}`);
    // Remove oldest streams based on creation time
    const streamsArray = Array.from(streams.entries());
    streamsArray.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const streamsToRemove = streamsArray.slice(0, streamsArray.length - MAX_STREAMS);
    
    for (const [streamId, _] of streamsToRemove) {
      streams.delete(streamId);
      streamMessages.delete(streamId);
      console.log(`Removed old stream: ${streamId} due to maximum streams limit`);
    }
  }
  
  // Limit the number of users
  if (users.size > MAX_USERS) {
    console.log(`Enforcing user limit: ${users.size} users, max allowed is ${MAX_USERS}`);
    // Remove oldest users (might be less optimal but prevents memory issues)
    const usersToRemove = Array.from(users.keys()).slice(0, users.size - MAX_USERS);
    for (const socketId of usersToRemove) {
      users.delete(socketId);
      console.log(`Removed inactive user with socket ID: ${socketId} due to maximum users limit`);
    }
  }
};

// Run cleanup and limit enforcement every minute
setInterval(() => {
  cleanupDisconnectedUsers();
  enforceLimits();
}, 60000);

// Function to log the current state of streams and users
const logState = () => {
  console.log('\n--- Current State ---');
  console.log(`Active Streams: ${streams.size}`);
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
        
        // Make sure the broadcaster is in the stream room for chat
        socket.join(streamId);
        
        // Notify broadcaster of current viewer count
        socket.emit('viewer-count', { count: existingStream.viewers.size });
        return;
      } else {
        socket.emit('error', { message: 'Stream ID already in use' });
        return;
      }
    }
    
    // Enforce limits before creating a new stream
    enforceLimits();
    
    // Create new stream
    streams.set(streamId, {
      broadcaster: user.username,
      viewers: new Set(),
      createdAt: Date.now() // Add creation timestamp for stream age tracking
    });
    
    // Update user info
    user.role = 'broadcaster';
    user.streamId = streamId;
    
    // Join the stream room for chat
    socket.join(streamId);
    
    // Create a welcome message in the chat
    const welcomeMessage = {
      username: 'System',
      message: `Stream started by ${user.username}`,
      timestamp: Date.now(),
      isSystem: true
    };
    
    // Initialize chat messages for this stream if not already done
    if (!streamMessages.has(streamId)) {
      streamMessages.set(streamId, []);
    }
    
    // Add welcome message to chat history
    streamMessages.get(streamId).push(welcomeMessage);
    
    // Emit the welcome message to the room (just the broadcaster at this point)
    io.to(streamId).emit('chat-message', welcomeMessage);
    
    console.log(`Stream started: ${streamId} by ${user.username}`);
    logState();
    
    // Broadcast to all users that a new stream is available
    socket.broadcast.emit('new-stream', {
      streamId,
      broadcaster: user.username,
      viewerCount: 0
    });
  });
  
  // Handle chat messages
  socket.on('send-chat-message', ({ streamId, message }) => {
    const user = users.get(socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not registered' });
      return;
    }
    
    // Check if stream exists
    if (!streams.has(streamId)) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }
    
    // Create chat message
    const chatMessage = {
      username: user.username,
      message,
      timestamp: Date.now()
    };
    
    // Store the message in memory
    if (!streamMessages.has(streamId)) {
      streamMessages.set(streamId, []);
    }
    
    // Add to message history (keep only MAX_MESSAGES_PER_STREAM messages)
    const messages = streamMessages.get(streamId);
    messages.push(chatMessage);
    if (messages.length > MAX_MESSAGES_PER_STREAM) {
      messages.shift(); // Remove oldest message if over limit
    }
    
    console.log(`Chat message from ${user.username} in stream ${streamId}: ${message}`);
    
    // Broadcast to all viewers and the broadcaster
    io.to(streamId).emit('chat-message', chatMessage);
  });
  
  // Get chat history for a stream
  socket.on('get-chat-messages', ({ streamId }) => {
    console.log(`Chat history requested for stream: ${streamId} by socket: ${socket.id}`);
    
    // Check if stream exists
    if (!streams.has(streamId)) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }
    
    // Get the stream info
    const stream = streams.get(streamId);
    
    // Get the user
    const user = users.get(socket.id);
    
    // Join the stream room if not already in it
    // This ensures the user (especially broadcaster) is in the room to receive messages
    if (user && user.streamId === streamId && !socket.rooms.has(streamId)) {
      console.log(`Socket ${socket.id} joining room for stream: ${streamId}`);
      socket.join(streamId);
    }
    
    // Send chat history with broadcaster info
    // Limit the number of messages sent to reduce payload size
    const allMessages = streamMessages.get(streamId) || [];
    // Only send the most recent 20 messages to reduce payload size
    const messages = allMessages.slice(Math.max(0, allMessages.length - 20));
    
    console.log(`Sending ${messages.length} of ${allMessages.length} chat messages to socket: ${socket.id}`);
    socket.emit('chat-messages', { 
      messages,
      broadcaster: stream.broadcaster
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
    
    // Add socket to the stream room for chat
    socket.join(streamId);
    
    console.log(`User ${username} joined stream ${streamId}`);
    logState();
    
    // Notify everyone in the stream that a new viewer joined
    io.to(streamId).emit('viewer-joined', { username: user.username });
    
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

  // Check if user is streamer
  socket.on('check-streamer', ({ streamId, username }) => {
    const user = users.get(socket.id);
    const stream = streams.get(streamId);
    
    if (user && stream) {
      const isStreamer = stream.broadcaster === username;
      socket.emit('streamer-status', { isStreamer });
    }
  });

  // Handle join requests
  socket.on('request-join', ({ streamId, username }) => {
    const stream = streams.get(streamId);
    if (!stream) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }

    // Find the broadcaster socket
    const broadcasterSocket = Array.from(io.sockets.sockets.values())
      .find(s => {
        const userData = users.get(s.id);
        return userData && userData.streamId === streamId && userData.role === 'broadcaster';
      });

    if (broadcasterSocket) {
      // Send join request to broadcaster
      broadcasterSocket.emit('join-request', { 
        username, 
        timestamp: Date.now() 
      });
    } else {
      socket.emit('error', { message: 'Broadcaster not found' });
    }
  });

  // Handle join request response
  socket.on('respond-join-request', ({ streamId, requestUsername, accept }) => {
    const user = users.get(socket.id);
    const stream = streams.get(streamId);
    
    if (!user || !stream || stream.broadcaster !== user.username) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    // Find the requesting user's socket
    const requestingSocket = Array.from(io.sockets.sockets.values())
      .find(s => {
        const userData = users.get(s.id);
        return userData && userData.username === requestUsername;
      });

    if (requestingSocket) {
      if (accept) {
        // Add user to co-streamers
        if (!stream.coStreamers) {
          stream.coStreamers = new Set();
        }
        stream.coStreamers.add(requestingSocket.id);
        
        // Update user role
        const requestingUser = users.get(requestingSocket.id);
        if (requestingUser) {
          requestingUser.role = 'co-streamer';
        }
        
        requestingSocket.emit('join-accepted');
        
        // Notify all viewers that someone joined as co-streamer
        io.to(streamId).emit('co-streamer-joined', { 
          username: requestUsername 
        });
      } else {
        requestingSocket.emit('join-rejected');
      }
    }
  });

  // Co-streamer WebRTC signaling
  socket.on('co-streamer-offer', ({ streamId, offer }) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    // Send offer to main broadcaster and other viewers
    socket.to(streamId).emit('co-streamer-offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('co-streamer-answer', ({ target, answer }) => {
    const targetSocket = io.sockets.sockets.get(target);
    if (targetSocket) {
      targetSocket.emit('co-streamer-answer', {
        from: socket.id,
        answer
      });
    }
  });

  socket.on('co-streamer-ice-candidate', ({ target, candidate, streamId }) => {
    if (target) {
      // Send to specific target
      const targetSocket = io.sockets.sockets.get(target);
      if (targetSocket) {
        targetSocket.emit('co-streamer-ice-candidate', {
          from: socket.id,
          candidate
        });
      }
    } else if (streamId) {
      // Broadcast to stream
      socket.to(streamId).emit('co-streamer-ice-candidate', {
        from: socket.id,
        candidate
      });
    }
  });

  // Kick co-streamer
  socket.on('kick-co-streamer', ({ streamId, coStreamerUsername }) => {
    const user = users.get(socket.id);
    const stream = streams.get(streamId);
    
    // Only allow broadcaster to kick co-streamers
    if (!user || !stream || stream.broadcaster !== user.username) {
      socket.emit('error', { message: 'Not authorized to kick co-streamers' });
      return;
    }

    // Find the co-streamer socket
    const coStreamerSocket = Array.from(io.sockets.sockets.values())
      .find(s => {
        const userData = users.get(s.id);
        return userData && userData.username === coStreamerUsername && userData.streamId === streamId;
      });

    if (coStreamerSocket) {
      const coStreamerUser = users.get(coStreamerSocket.id);
      if (coStreamerUser) {
        // Remove from co-streamers
        if (stream.coStreamers) {
          stream.coStreamers.delete(coStreamerSocket.id);
        }
        
        // Change role back to viewer
        coStreamerUser.role = 'viewer';
        
        // Add back to viewers
        stream.viewers.add(coStreamerSocket.id);
        
        // Notify the kicked user
        coStreamerSocket.emit('kicked-from-co-streaming');
        
        // Notify all users in the stream
        io.to(streamId).emit('co-streamer-left', { 
          username: coStreamerUsername 
        });
        
        console.log(`User ${coStreamerUsername} was kicked from co-streaming by ${user.username}`);
      }
    }
  });

  // Leave co-streaming
  socket.on('leave-co-streaming', ({ streamId }) => {
    const user = users.get(socket.id);
    const stream = streams.get(streamId);
    
    if (!user || !stream || user.role !== 'co-streamer') {
      socket.emit('error', { message: 'Not currently co-streaming' });
      return;
    }

    // Remove from co-streamers
    if (stream.coStreamers) {
      stream.coStreamers.delete(socket.id);
    }
    
    // Change role back to viewer
    user.role = 'viewer';
    
    // Add back to viewers
    stream.viewers.add(socket.id);
    
    // Notify all users in the stream
    io.to(streamId).emit('co-streamer-left', { 
      username: user.username 
    });
    
    console.log(`User ${user.username} left co-streaming`);
  });

  // Leave stream
  socket.on('leave-stream', () => {
    const user = users.get(socket.id);
    
    if (user && user.streamId) {
      // Leave the stream room for chat
      socket.leave(user.streamId);
      
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
          
          // Notify everyone in the stream that a viewer left
          io.to(user.streamId).emit('viewer-left', { username: user.username });
        }
      } else if (user.role === 'broadcaster') {
        // Create stream ended message
        const streamEndedMessage = {
          username: 'System',
          message: `Stream ended by ${user.username}`,
          timestamp: Date.now(),
          isSystem: true
        };
        
        // Add to message history if the stream exists
        const streamId = user.streamId;
        if (streamMessages.has(streamId)) {
          streamMessages.get(streamId).push(streamEndedMessage);
        }
        
        // Send the message to all viewers
        io.to(streamId).emit('chat-message', streamEndedMessage);
        
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
      
      // Leave any rooms
      if (user.streamId) {
        socket.leave(user.streamId);
        
        // Handle as if user left the stream
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
            
            // Notify everyone in the stream that a viewer left
            io.to(user.streamId).emit('viewer-left', { username: user.username });
          }
        } else if (user.role === 'broadcaster') {
          // Create stream ended message for unexpected disconnect
          const streamEndedMessage = {
            username: 'System',
            message: `Stream ended unexpectedly (${user.username} disconnected)`,
            timestamp: Date.now(),
            isSystem: true
          };
          
          // Add to message history if the stream exists
          const streamId = user.streamId;
          if (streamMessages.has(streamId)) {
            streamMessages.get(streamId).push(streamEndedMessage);
          }
          
          // Send the message to all viewers
          io.to(streamId).emit('chat-message', streamEndedMessage);
          
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