import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import './App.css'

interface Stream {
  streamId: string
  broadcaster: string
  viewerCount: number
  title?: string
  description?: string
  category?: string
}
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Components
import Home from './pages/Home'
import CreateStream from './components/CreateStream'

import WatchVideo from './pages/WatchVideo'
import WatchStream from './pages/WatchStream'
import CategoryPage from './pages/CategoryPage'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Browse from './pages/Browse'
import Following from './pages/Following'
import Library from './pages/Library'
import Profile from './pages/Profile'
import Quran from './pages/Quran'
import Bible from './pages/Bible'
import Hadith from './pages/Hadith'

// Create socket connection
const createSocket = (): Socket => {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 
                   (import.meta.env.PROD ? 'https://server-production-d7dd.up.railway.app' : 'http://localhost:3001')
  
  console.log('🔗 Socket connecting to:', serverUrl)
  console.log('🔧 Environment variables:', {
    VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE
  })
  
  return io(serverUrl, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true
  })
}

function App() {
  const [username, setUsername] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [activeStreams, setActiveStreams] = useState<Stream[]>([])
  const [, setConnectionError] = useState<string>('')
  
  const socketRef = useRef<Socket | null>(null)

  // Check authentication status
  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('token')
    const storedUsername = localStorage.getItem('username')
    
    console.log('Checking auth status:', { hasToken: !!token, hasUsername: !!storedUsername })
    
    if (token && storedUsername) {
      console.log('User is authenticated')
      setUsername(storedUsername)
      setIsLoggedIn(true)
      return true
    } else {
      console.log('User is not authenticated')
      setIsLoggedIn(false)
      return false
    }
  }, [])
  
  // Initialize socket connection
  useEffect(() => {
    // Check authentication first
    
    if (!socketRef.current) {
      socketRef.current = createSocket()
      
      // Socket connection event handlers
      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        setConnectionError('')
        
        // Register user if already logged in
        const storedUsername = localStorage.getItem('username')
        if (storedUsername) {
          console.log('Registering user with socket:', storedUsername)
          socketRef.current?.emit('register', { username: storedUsername })
        }
        
        // Request active streams on connection
        socketRef.current?.emit('get-active-streams')
      })
      
      socketRef.current.on('connect_error', (err) => {
        console.error('Connection error:', err)
        setConnectionError('Failed to connect to server. Please try again later.')
      })
      
      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason)
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          socketRef.current?.connect()
        }
      })
    }
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [checkAuthStatus])

  // Handle socket events for streams
  useEffect(() => {
    if (!socketRef.current) return
    
    const handleActiveStreams = (streams: Stream[]) => {
      console.log('Received active streams:', streams)
      setActiveStreams(streams)
    }
    
    const handleStreamStarted = () => {
      // Refresh active streams when a new stream starts
      console.log('Stream started event received, refreshing streams')
      socketRef.current?.emit('get-active-streams')
    }
    
    const handleStreamEnded = () => {
      // Refresh active streams when a stream ends
      console.log('Stream ended event received, refreshing streams')
      socketRef.current?.emit('get-active-streams')
    }
    
    // Load user information from localStorage if available
    checkAuthStatus()

    // Socket event listeners
    socketRef.current.on('active-streams', handleActiveStreams)
    socketRef.current.on('stream-started', handleStreamStarted)
    socketRef.current.on('stream-ended', handleStreamEnded)
    socketRef.current.on('new-stream', () => {
      console.log('New stream event received, refreshing streams')
      socketRef.current?.emit('get-active-streams')
    })

    // Request active streams on initial load
    console.log('Requesting active streams on component mount')
    socketRef.current.emit('get-active-streams')

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('active-streams', handleActiveStreams)
        socketRef.current.off('stream-started', handleStreamStarted)
        socketRef.current.off('stream-ended', handleStreamEnded)
        socketRef.current.off('new-stream')
      }
    }
  }, [checkAuthStatus])

  const handleLogin = (username: string) => {
    console.log('Setting login state for:', username)
    setUsername(username)
    setIsLoggedIn(true)
    localStorage.setItem('username', username)
    socketRef.current?.emit('register', { username })
  }

  const handleLogout = () => {
    setUsername('')
    setIsLoggedIn(false)
    localStorage.removeItem('username')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // After logout, user will be redirected to login page because of ProtectedRoute
    window.location.href = '/login'
  }

  return (
    <Router>
      <AppContent 
        username={username}
        isLoggedIn={isLoggedIn}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        activeStreams={activeStreams}
        socketRef={socketRef}
      />
    </Router>
  )
}

interface AppContentProps {
  username: string;
  isLoggedIn: boolean;
  handleLogin: (username: string) => void;
  handleLogout: () => void;
  activeStreams: Stream[];
  socketRef: React.MutableRefObject<Socket | null>;
}

const AppContent = ({ username, isLoggedIn, handleLogout, activeStreams, socketRef }: AppContentProps) => {
  const location = useLocation();

  return (
    <div className="App" style={{ display: 'flex' }}>
      {/* Sidebar - only show when logged in and not on login/register */}
      {isLoggedIn && !['/login', '/register'].includes(location.pathname) && (
        <Sidebar username={username} />
      )}
      
      {/* Header - only show when not on login/register */}
      {!['/login', '/register'].includes(location.pathname) && (
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      )}
      
      <div style={{ flex: 1 }}>

        
        <div style={{ marginTop: isLoggedIn ? '0' : '0' }}>
          <Routes>
            <Route 
              path="/login" 
              element={
                isLoggedIn ? <Navigate to="/" replace /> : <Login />
              } 
            />
            <Route 
              path="/register" 
              element={
                isLoggedIn ? <Navigate to="/" replace /> : <Register />
              } 
            />
            <Route
              path="/"
              element={
                  <Home 
                    activeStreams={activeStreams}
                  />
              }
            />
            <Route 
              path="/browse" 
              element={
                <ProtectedRoute>
                  <Browse />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/following" 
              element={
                <ProtectedRoute>
                  <Following />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/library" 
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile username={username} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create" 
              element={
                isLoggedIn 
                  ? <CreateStream username={username} socket={socketRef.current!} /> 
                  : <Navigate to="/" />
              } 
            />
            <Route 
              path="/view/:streamId" 
              element={
                isLoggedIn 
                  ? <WatchStream username={username} socket={socketRef.current!} /> 
                  : <Navigate to="/" />
              } 
            />
            <Route path="/quran" element={<Quran />} />
            <Route path="/bible" element={<Bible />} />
            <Route path="/hadith" element={<Hadith />} />
            <Route path="/video/:id" element={<WatchVideo />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App
