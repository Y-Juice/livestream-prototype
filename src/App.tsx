import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import './App.css'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Components
import Home from './components/Home'
import CreateStream from './components/CreateStream'
import ViewStream from './components/ViewStream'
import Navbar from './components/Navbar'
import Transcription from './components/Transcription'

// Create socket connection
const createSocket = (): Socket => {
  return io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  })
}

function App() {
  const [username, setUsername] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [activeStreams, setActiveStreams] = useState<any[]>([])
  const [connectionError, setConnectionError] = useState<string>('')
  const [isTranscriptionActive, setIsTranscriptionActive] = useState<boolean>(false)
  
  const socketRef = useRef<Socket | null>(null)

  // Check authentication status
  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('token')
    const storedUsername = localStorage.getItem('username')
    const storedUser = localStorage.getItem('user')
    
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
    const isAuthenticated = checkAuthStatus()
    
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
    
    const handleActiveStreams = (streams: any[]) => {
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
      <div className="min-h-screen bg-gray-100">
        <Navbar 
          username={username} 
          isLoggedIn={isLoggedIn} 
          onLogout={handleLogout} 
        />
        <div className="container mx-auto px-4 py-8">
          {connectionError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {connectionError}
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={() => setIsTranscriptionActive(!isTranscriptionActive)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {isTranscriptionActive ? 'Stop Speech Recognition' : 'Start Speech Recognition'}
            </button>
            <span className="ml-2 text-sm text-gray-600">
              Using browser's built-in speech recognition
            </span>
          </div>

          {isTranscriptionActive && <Transcription isActive={isTranscriptionActive} />}

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
                <ProtectedRoute>
                  <Home 
                    username={username}
                    isLoggedIn={isLoggedIn}
                    onLogin={handleLogin}
                    activeStreams={activeStreams}
                  />
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
                  ? <ViewStream username={username} socket={socketRef.current!} /> 
                  : <Navigate to="/" />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
