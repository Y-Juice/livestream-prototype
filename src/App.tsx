import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import './App.css'

// Components
import Home from './components/Home'
import CreateStream from './components/CreateStream'
import ViewStream from './components/ViewStream'
import Navbar from './components/Navbar'

// Create socket connection
const createSocket = (): Socket => {
  return io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000', {
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
  
  const socketRef = useRef<Socket | null>(null)
  
  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = createSocket()
      
      // Socket connection event handlers
      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        setConnectionError('')
        
        // Register user if already logged in
        const storedUsername = localStorage.getItem('username')
        if (storedUsername) {
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
  }, [])

  // Handle socket events for streams
  useEffect(() => {
    if (!socketRef.current) return
    
    const handleActiveStreams = (streams: any[]) => {
      setActiveStreams(streams)
    }
    
    const handleStreamStarted = () => {
      // Refresh active streams when a new stream starts
      socketRef.current?.emit('get-active-streams')
    }
    
    const handleStreamEnded = () => {
      // Refresh active streams when a stream ends
      socketRef.current?.emit('get-active-streams')
    }
    
    // Load username from localStorage if available
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
      setIsLoggedIn(true)
      socketRef.current.emit('register', { username: storedUsername })
    }

    // Socket event listeners
    socketRef.current.on('active-streams', handleActiveStreams)
    socketRef.current.on('stream-started', handleStreamStarted)
    socketRef.current.on('stream-ended', handleStreamEnded)

    // Request active streams on initial load
    socketRef.current.emit('get-active-streams')

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('active-streams', handleActiveStreams)
        socketRef.current.off('stream-started', handleStreamStarted)
        socketRef.current.off('stream-ended', handleStreamEnded)
      }
    }
  }, [])

  const handleLogin = (username: string) => {
    setUsername(username)
    setIsLoggedIn(true)
    localStorage.setItem('username', username)
    socketRef.current?.emit('register', { username })
  }

  const handleLogout = () => {
    setUsername('')
    setIsLoggedIn(false)
    localStorage.removeItem('username')
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
          
          <Routes>
            <Route 
              path="/" 
              element={
                <Home 
                  username={username}
                  isLoggedIn={isLoggedIn}
                  onLogin={handleLogin}
                  activeStreams={activeStreams}
                />
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
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
