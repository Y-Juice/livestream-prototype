import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Socket } from 'socket.io-client'
import '../css/ViewStream.css'
import libraryIcon from '../assets/library.png'

interface ViewStreamProps {
  username: string
  socket: Socket
  hasJoined?: boolean
  cameraEnabled?: boolean
  micEnabled?: boolean
  onCameraToggle?: () => void
  onMicToggle?: () => void
}

interface CoStreamer {
  username: string
  socketId: string
  stream?: MediaStream
}

interface StreamMetadata {
  title?: string
  description?: string
  category?: string
}

const ViewStream = ({ username, socket, hasJoined, cameraEnabled, micEnabled, onCameraToggle, onMicToggle }: ViewStreamProps) => {
  const { streamId } = useParams<{ streamId: string }>()
  const [broadcaster, setBroadcaster] = useState<string>('')
  const [streamMetadata, setStreamMetadata] = useState<StreamMetadata>({})
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [videoVisible, setVideoVisible] = useState<boolean>(false)
  const [connectionState, setConnectionState] = useState<string>('connecting')
  const [coStreamers, setCoStreamers] = useState<CoStreamer[]>([])
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localPeerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const playAttemptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const coStreamerPeerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  
  const navigate = useNavigate()

  const getCategoryIcon = (category: string): string | React.ReactNode => {
    const icons: { [key: string]: string | React.ReactNode } = {
      'History of Islam': <img src={libraryIcon} alt="History of Islam" className="category-icon-img" />,
      'Feminism & Red Pill': '⚖️',
      'Christianity': <img src={libraryIcon} alt="Christianity" className="category-icon-img" />,
      'Atheism': '🔬',
      'Refutations': '🛡️',
      'Miracles of the Quran': <img src={libraryIcon} alt="Miracles of the Quran" className="category-icon-img" />,
      "Speaker's Corner": '🎤'
    }
    return icons[category] || '📺'
  }

  // Initialize local stream when user joins
  useEffect(() => {
    if (hasJoined && !isStreaming) {
      startLocalStream()
    } else if (!hasJoined && isStreaming) {
      stopLocalStream()
    }
  }, [hasJoined, isStreaming])

  // Update local stream tracks when camera/mic toggles
  useEffect(() => {
    if (localStreamRef.current && isStreaming) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      const audioTracks = localStreamRef.current.getAudioTracks()
      
      videoTracks.forEach(track => {
        track.enabled = cameraEnabled || false
      })
      
      audioTracks.forEach(track => {
        track.enabled = micEnabled || false
      })
    }
  }, [cameraEnabled, micEnabled, isStreaming])

  const startLocalStream = async () => {
    try {
      console.log('Starting local stream for co-streamer')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      setIsStreaming(true)
      
      // Create peer connection for sending our stream
      await setupLocalPeerConnection()
      
    } catch (error) {
      console.error('Error starting local stream:', error)
      setError('Could not access camera/microphone')
    }
  }

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    
    if (localPeerConnectionRef.current) {
      localPeerConnectionRef.current.close()
      localPeerConnectionRef.current = null
    }
    
    setIsStreaming(false)
  }

  const setupLocalPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    localPeerConnectionRef.current = pc
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('co-streamer-ice-candidate', {
          streamId,
          candidate: event.candidate
        })
      }
    }
    
    // Create offer for co-streaming
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    socket.emit('co-streamer-offer', {
      streamId,
      offer
    })
  }

  // Function to handle remote stream
  const handleRemoteStream = () => {
    if (!remoteStreamRef.current || !remoteVideoRef.current) {
      console.warn('Cannot handle remote stream: missing references')
      return
    }
    
    console.log('*** HANDLING REMOTE STREAM ***', 'Tracks:', 
      remoteStreamRef.current.getTracks().map(t => `${t.kind}:${t.enabled ? 'enabled' : 'disabled'}`).join(', '))
    
    // Only set srcObject if it's different to avoid interrupting playback
    if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        console.log('Setting srcObject on video element')
        remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
        
    // Only try to play if we have tracks and video is paused
    if (remoteStreamRef.current.getTracks().length > 0 && remoteVideoRef.current.paused) {
          // Clear any existing timeout
          if (playAttemptTimeoutRef.current) {
            clearTimeout(playAttemptTimeoutRef.current)
          }
          
      console.log('Attempting to play video')
      
      const attemptPlayback = async (retryCount = 0) => {
                if (retryCount >= 3) {
                  console.error('Max playback retry attempts reached')
                  setError('Could not start video playback. Please try refreshing.')
                  return
                }

        try {
          await remoteVideoRef.current?.play()
                    console.log('Video playback started successfully')
                    setIsConnected(true)
          setVideoVisible(true)
                    setError('')
        } catch (err) {
                    console.error(`Error playing video (attempt ${retryCount + 1}):`, err)
          if (retryCount < 2) {
                    setTimeout(() => attemptPlayback(retryCount + 1), 1000)
        } else {
            setError('Could not start video playback. Please try refreshing.')
        }
      }
      }

      attemptPlayback()
    } else if (remoteStreamRef.current.getTracks().length === 0) {
      console.warn('No tracks in remote stream')
      setError('No media tracks received. Please try refreshing.')
    }
  }

  useEffect(() => {
    console.log('Initializing ViewStream component', { streamId, username })
    
    // Join the stream
    if (streamId) {
      console.log(`Joining stream: ${streamId}`)
      socket.emit('join-stream', { streamId, username })
    }

    // Socket event listeners for WebRTC signaling
    const handleStreamNotFound = () => {
      console.log('Stream not found')
      setError('Stream not found or has ended')
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }

    const handleOffer = async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
      console.log(`Received offer from: ${from}`)
      
      // Prevent handling multiple offers
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        console.log('Already handling an offer, ignoring this one')
        return
      }
      
      try {
        // Store broadcaster info
        const activeStreams = await new Promise<any[]>((resolve) => {
          socket.emit('get-active-streams')
          socket.once('active-streams', resolve)
        })
        
        const stream = activeStreams.find(s => s.streamId === streamId)
        if (stream) {
          setBroadcaster(stream.broadcaster)
          setStreamMetadata({
            title: stream.title,
            description: stream.description,
            category: stream.category,
          })
          console.log(`Broadcaster is: ${stream.broadcaster}`)
        }
        
        await handleOfferInternal(from, offer)
      } catch (err) {
        console.error('Error handling offer:', err)
        setError('Failed to connect to stream')
        setConnectionState('failed')
      }
    }

    const handleIceCandidate = ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      console.log(`Received ICE candidate from: ${from}`)
      if (peerConnectionRef.current && 
          peerConnectionRef.current.signalingState !== 'closed' &&
          peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => console.log('Added ICE candidate successfully'))
          .catch(err => {
            console.error('Error adding ICE candidate:', err)
          })
      } else {
        console.log(`Cannot add ICE candidate from ${from}, connection state: ${peerConnectionRef.current?.signalingState || 'null'}`)
      }
    }

    const handleCoStreamerJoined = ({ username: coStreamerName }: { username: string }) => {
      console.log(`Co-streamer joined: ${coStreamerName}`)
      // Add co-streamer to list
      setCoStreamers(prev => [
        ...prev.filter(cs => cs.username !== coStreamerName),
        { username: coStreamerName, socketId: `${coStreamerName}-${Date.now()}` }
      ])
    }

    const handleCoStreamerOffer = async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
      console.log(`Received co-streamer offer from: ${from}`)
      
      // Create peer connection for co-streamer
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      coStreamerPeerConnections.current.set(from, pc)
      
      pc.ontrack = (event) => {
        console.log('Received co-streamer track:', event.track.kind)
        const stream = event.streams[0]
        
        // Update co-streamer with stream
        setCoStreamers(prev => 
          prev.map(cs => 
            cs.socketId === from 
              ? { ...cs, stream }
              : cs
          )
        )
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('co-streamer-ice-candidate', {
            target: from,
            candidate: event.candidate
          })
        }
      }
      
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      socket.emit('co-streamer-answer', {
        target: from,
        answer
      })
    }

    const handleCoStreamerAnswer = async ({ answer }: { from: string, answer: RTCSessionDescriptionInit }) => {
      const pc = localPeerConnectionRef.current
      if (pc) {
        await pc.setRemoteDescription(answer)
      }
    }

    const handleCoStreamerIceCandidate = ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const pc = coStreamerPeerConnections.current.get(from) || localPeerConnectionRef.current
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }

    const handleStreamEnded = () => {
      console.log('Stream has ended')
      setError('Stream has ended')
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }

    const handleError = ({ message }: { message: string }) => {
      console.error(`Error from server: ${message}`)
      setError(message)
    }

    socket.on('stream-not-found', handleStreamNotFound)
    socket.on('offer', handleOffer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('co-streamer-joined', handleCoStreamerJoined)
    socket.on('co-streamer-offer', handleCoStreamerOffer)
    socket.on('co-streamer-answer', handleCoStreamerAnswer)
    socket.on('co-streamer-ice-candidate', handleCoStreamerIceCandidate)
    socket.on('stream-ended', handleStreamEnded)
    socket.on('error', handleError)

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up ViewStream component')
      
      if (streamId) {
        socket.emit('leave-stream')
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      if (localPeerConnectionRef.current) {
        localPeerConnectionRef.current.close()
        localPeerConnectionRef.current = null
      }
      
      coStreamerPeerConnections.current.forEach(pc => pc.close())
      coStreamerPeerConnections.current.clear()
      
      stopLocalStream()
      
      socket.off('stream-not-found', handleStreamNotFound)
      socket.off('offer', handleOffer)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('co-streamer-joined', handleCoStreamerJoined)
      socket.off('co-streamer-offer', handleCoStreamerOffer)
      socket.off('co-streamer-answer', handleCoStreamerAnswer)
      socket.off('co-streamer-ice-candidate', handleCoStreamerIceCandidate)
      socket.off('stream-ended', handleStreamEnded)
      socket.off('error', handleError)
    }
  }, [streamId, socket, username, navigate])

  const handleOfferInternal = async (broadcasterId: string, offer: RTCSessionDescriptionInit) => {
    try {
      console.log('Setting up peer connection for offer')
      
      // Close existing peer connection if any
      if (peerConnectionRef.current) {
        console.log('Closing existing peer connection')
            peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      peerConnectionRef.current = pc
      
      pc.ontrack = (event) => {
        console.log('Received track:', event.track.kind, event.track.enabled ? 'enabled' : 'disabled')
        
        const stream = event.streams[0]
        console.log('Received stream with tracks:', stream.getTracks().length)
        
        // Only update and handle stream if it's different
        if (remoteStreamRef.current !== stream) {
          remoteStreamRef.current = stream
          // Small delay to allow all tracks to be received
          setTimeout(() => handleRemoteStream(), 500)
        }
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to broadcaster')
          socket.emit('ice-candidate', {
            target: broadcasterId,
            candidate: event.candidate
          })
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState)
        setConnectionState(pc.connectionState)
        
        if (pc.connectionState === 'connected') {
          setIsConnected(true)
          setError('')
        } else if (pc.connectionState === 'failed') {
          setConnectionState('failed')
          setError('Connection failed. Please try refreshing.')
        }
      }
      
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      socket.emit('answer', { target: broadcasterId, answer })
      
    } catch (err) {
      console.error('Error in handleOfferInternal:', err)
      throw err
    }
  }

  const handleVideoClick = () => {
    if (remoteVideoRef.current && remoteVideoRef.current.paused) {
      console.log('Manual play attempt')
      remoteVideoRef.current.play()
        .then(() => {
          console.log('Manual play successful')
          setError('')
          setIsConnected(true)
          setVideoVisible(true)
        })
        .catch(err => {
          console.error('Error playing video after click:', err)
          setError('Browser blocked autoplay. Please try again.')
        })
    }
  }

  const handleRefreshVideo = () => {
    console.log('Refreshing video')
    // Implementation remains the same as before
  }



  const handleLeaveStream = () => {
    if (streamId) {
      socket.emit('leave-stream')
    }
    navigate('/')
  }

  return (
    <div className="w-full">
        <div className="relative bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
                {error}
              </div>
            </div>
          )}
          
          <div className="relative" ref={videoContainerRef}>
          {/* Main video layout */}
          <div className={`video-layout ${hasJoined || coStreamers.length > 0 ? 'split-screen' : 'single-screen'}`}>
            {/* Main stream video */}
            <div className="main-video">
            <video 
              ref={remoteVideoRef}
              className={`w-full h-auto transition-opacity duration-300 ${videoVisible ? 'opacity-100' : 'opacity-0'}`}
              autoPlay
              playsInline
              onClick={handleVideoClick}
                style={{ minHeight: '200px', background: '#000' }}
            />
            {!isConnected && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 p-4 rounded text-white">
                  Connecting to stream...
                </div>
              </div>
            )}
            </div>

            {/* Co-streamer videos */}
            {(hasJoined || coStreamers.length > 0) && (
              <div className="co-streamer-section">
                {/* User's own video when joined */}
                {hasJoined && (
                  <div className="co-streamer-video-container">
                    <video
                      ref={localVideoRef}
                      className="co-streamer-video"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="video-label">
                      {username} (You)
                    </div>
                    {hasJoined && (
                      <div className="video-controls">
                        <button 
                          className={`control-btn ${cameraEnabled ? 'active' : 'inactive'}`}
                          onClick={onCameraToggle}
                        >
                          {cameraEnabled ? '📹' : '📹'}
                        </button>
                        <button 
                          className={`control-btn ${micEnabled ? 'active' : 'inactive'}`}
                          onClick={onMicToggle}
                        >
                          {micEnabled ? '🎤' : '🔇'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Other co-streamers */}
                {coStreamers.map((coStreamer) => (
                  <div key={coStreamer.socketId} className="co-streamer-video-container">
                    <video
                      className="co-streamer-video"
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && coStreamer.stream) {
                          el.srcObject = coStreamer.stream
                        }
                      }}
                    />
                    <div className="video-label">
                      {coStreamer.username}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          
          <div className="p-4 bg-gray-900 text-white">
          <div className="flex justify-between items-center mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div>
              <h2 className="text-xl font-semibold">
                    {streamMetadata.title || (broadcaster ? `${broadcaster}'s stream` : 'Live Stream')}
              </h2>
                  {streamMetadata.category && (
                    <div className="text-sm text-green-400 mt-1">
                      <span className="category-icon">{getCategoryIcon(streamMetadata.category)}</span>
                      <span>{streamMetadata.category}</span>
                    </div>
                  )}
                </div>
              </div>
              {streamMetadata.description && (
                <p className="stream-description">
                  {streamMetadata.description}
                </p>
              )}
              <div className="text-sm text-gray-400">
                Streamed by <span className="text-green-400 font-medium">{broadcaster}</span>
              </div>
            </div>
              <button
                onClick={handleLeaveStream}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Leave Stream
              </button>
            </div>
          <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {connectionState === 'connected' ? 'Connected' : 'Connecting...'}
              {coStreamers.length > 0 && ` • ${coStreamers.length + (hasJoined ? 1 : 0)} co-streamers`}
              </div>
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                onClick={handleRefreshVideo}
              >
                Refresh Video
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}

export default ViewStream 