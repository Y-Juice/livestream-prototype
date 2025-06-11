import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import Chat from './Chat'
import '../css/CreateStream.css'
import libraryIcon from '../assets/library.png'

interface CreateStreamProps {
  username: string
  socket: Socket
}

interface JoinRequest {
  username: string
  timestamp: number
}

interface CoStreamer {
  username: string
  socketId: string
  stream?: MediaStream
}

interface StreamMetadata {
  title: string
  description: string
  category: string
}

const CreateStream = ({ username, socket }: CreateStreamProps) => {
  const [streamId, setStreamId] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [viewerCount, setViewerCount] = useState<number>(0)
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true)
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
  const [streamStats, setStreamStats] = useState<{
    resolution: string
    frameRate: number
  }>({ resolution: 'N/A', frameRate: 0 })
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [coStreamers, setCoStreamers] = useState<CoStreamer[]>([])
  const [streamMetadata, setStreamMetadata] = useState<StreamMetadata>({
    title: '',
    description: '',
    category: ''
  })
  const [showMetadataForm, setShowMetadataForm] = useState<boolean>(true)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const coStreamerPeerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const navigate = useNavigate()

  const categories = [
    'History of Islam', 'Feminism & Red Pill', 'Christianity', 'Atheism', 
    'Refutations', 'Miracles of the Quran', "Speaker's Corner"
  ]

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



  const handleMetadataSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!streamMetadata.title.trim() || !streamMetadata.category) {
      setError('Please fill in the title and select a category')
      return
    }
    setShowMetadataForm(false)
  }

  // Handle join request response
  const handleJoinRequestResponse = (requestUsername: string, accept: boolean) => {
    if (socket && streamId) {
      socket.emit('respond-join-request', { 
        streamId, 
        requestUsername, 
        accept 
      })
      
      setJoinRequests(prev => 
        prev.filter(req => req.username !== requestUsername)
      )
    }
  }

  // Handle kicking a co-streamer
  const handleKickCoStreamer = (coStreamerUsername: string) => {
    if (socket && streamId) {
      socket.emit('kick-co-streamer', { 
        streamId, 
        coStreamerUsername 
      })
      
      // Remove from local state
      setCoStreamers(prev => 
        prev.filter(cs => cs.username !== coStreamerUsername)
      )
    }
  }

  // Initialize stream
  const initializeStream = async () => {
    try {
      // Stop any existing stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Get user media with specific constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })
      
      console.log('Media stream acquired:', 
        stream.getTracks().map(t => `${t.kind}:${t.label}:${t.enabled}`).join(', '))
      
      // Store the stream
      localStreamRef.current = stream
      
      // Set the stream as the video source
      if (localVideoRef.current) {
        console.log('Setting up local video element')
        
        // Ensure video element is ready
        const videoElement = localVideoRef.current
        
        // First clear the video source to ensure refresh
        videoElement.srcObject = null
        
        // Wait for the video element to be ready
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Set the stream
        videoElement.srcObject = stream
        videoElement.muted = true  // Ensure muted for autoplay
        
        // Force video to load and play
        const attemptPlay = async (retries = 5) => {
          try {
            await videoElement.load() // Force reload
            await videoElement.play()
            console.log('Local video playing successfully')
          } catch (err) {
            console.error('Error playing local video:', err)
            if (retries > 0) {
              console.log(`Retrying playback, ${retries} attempts left`)
              setTimeout(() => attemptPlay(retries - 1), 800)
            }
          }
        }
        
        await attemptPlay()
      }
      
      // Start collecting stats
      startStatsCollection()
      
      return stream
    } catch (err) {
      console.error('Error getting user media:', err)
      setError('Could not access camera or microphone')
      throw err
    }
  }

  // Start collecting stream stats
  const startStatsCollection = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }
    
    statsIntervalRef.current = setInterval(() => {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack) {
          const settings = videoTrack.getSettings()
          const width = settings.width || 0
          const height = settings.height || 0
          const frameRate = settings.frameRate || 0
          
          setStreamStats({
            resolution: `${width}x${height}`,
            frameRate: Math.round(frameRate)
          })
        }
      }
    }, 2000)
  }

  // Start streaming
  const startStream = async () => {
    try {
      setError('')
      
      // Generate a stream ID if not provided
      const newStreamId = streamId || uuidv4().substring(0, 8)
      setStreamId(newStreamId)
      
      // Initialize the stream
      await initializeStream()
      
      // Notify server with metadata
      socket.emit('start-stream', { 
        streamId: newStreamId, 
        metadata: {
          title: streamMetadata.title,
          description: streamMetadata.description,
          category: streamMetadata.category
        }
      })
      
      // Set streaming state
      setIsStreaming(true)
      
      console.log(`Stream started with ID: ${newStreamId}`)
    } catch (err) {
      console.error('Error starting stream:', err)
      setError('Failed to start stream')
    }
  }

  // Test stream creation (without media)
  const createTestStream = () => {
    try {
      const testStreamId = `test-${uuidv4().substring(0, 5)}`;
      console.log(`Creating test stream with ID: ${testStreamId}`);
      
      // Notify server of test stream creation with metadata
      socket.emit('start-stream', { 
        streamId: testStreamId,
        metadata: {
          title: streamMetadata.title || 'Test Stream',
          description: streamMetadata.description || 'This is a test stream',
          category: streamMetadata.category || 'Technology'
        }
      });
      
      // Set stream ID but don't initialize media
      setStreamId(testStreamId);
      setIsStreaming(true);
      
      // Alert the user
      alert(`Test stream created with ID: ${testStreamId}. This stream won't have media but will show up in the stream list.`);
    } catch (err) {
      console.error('Error creating test stream:', err);
      setError('Failed to create test stream');
    }
  };

  // Stop streaming
  const stopStream = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => {
      if (pc.signalingState !== 'closed') {
        pc.close()
      }
    })
    
    // Clear peer connections
    peerConnectionsRef.current.clear()
    
    // Stop stats collection
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
    }
    
    // Notify server
    socket.emit('leave-stream')
    
    // Reset state
    setIsStreaming(false)
    setViewerCount(0)
    
    // Navigate back to home
    navigate('/')
  }

  // Toggle video
  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      
      if (videoTracks.length > 0) {
        const newState = !videoEnabled
        setVideoEnabled(newState)
        
        videoTracks.forEach(track => {
          track.enabled = newState
        })
        
        // Update all peer connections with the new track state
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender && sender.track) {
            sender.track.enabled = newState
          }
        })
      }
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      
      if (audioTracks.length > 0) {
        const newState = !audioEnabled
        setAudioEnabled(newState)
        
        audioTracks.forEach(track => {
          track.enabled = newState
        })
        
        // Update all peer connections with the new track state
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
          if (sender && sender.track) {
            sender.track.enabled = newState
          }
        })
      }
    }
  }

  // Restart video
  const restartVideo = async () => {
    try {
      if (localStreamRef.current) {
        // Stop existing video tracks
        localStreamRef.current.getVideoTracks().forEach(track => track.stop())
        
        // Get new video track
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const newVideoTrack = newStream.getVideoTracks()[0]
        
        if (newVideoTrack) {
          // Replace video track in local stream
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0]
          if (oldVideoTrack) {
            localStreamRef.current.removeTrack(oldVideoTrack)
          }
          localStreamRef.current.addTrack(newVideoTrack)
          
          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
          }
          
          // Replace track in all peer connections
          peerConnectionsRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(newVideoTrack)
                .then(() => console.log('Video track replaced in peer connection'))
                .catch(err => console.error('Error replacing video track:', err))
            }
          })
          
          // Update state
          setVideoEnabled(true)
          console.log('Video restarted successfully')
        }
      }
    } catch (err) {
      console.error('Error restarting video:', err)
      setError('Failed to restart video')
    }
  }

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return
    
    // Handle viewer joined
    const handleViewerJoined = ({ username }: { username: string }) => {
      console.log(`Viewer joined: ${username}`)
    }
    
    // Handle viewer count update
    const handleViewerCount = ({ count }: { count: number }) => {
      console.log(`Viewer count updated: ${count}`)
      setViewerCount(count)
    }
    
    // Handle request for offer
    const handleRequestOffer = async ({ target }: { target: string }) => {
      try {
        console.log(`Creating offer for viewer: ${target}`)
        
        // Clean up any existing peer connection for this target
        if (peerConnectionsRef.current.has(target)) {
          const existingConnection = peerConnectionsRef.current.get(target)
          if (existingConnection) {
            try {
              existingConnection.close()
            } catch (err) {
              console.warn(`Error closing existing peer connection for ${target}:`, err)
            }
            peerConnectionsRef.current.delete(target)
          }
        }
        
        // Limit the maximum number of peer connections to prevent memory leaks
        const MAX_PEER_CONNECTIONS = 10
        if (peerConnectionsRef.current.size >= MAX_PEER_CONNECTIONS) {
          console.warn(`Maximum peer connections (${MAX_PEER_CONNECTIONS}) reached. Closing oldest connection.`)
          // Get the oldest connection (first key in Map)
          const oldestTarget = peerConnectionsRef.current.keys().next().value as string | undefined
          if (oldestTarget) {
            const oldConnection = peerConnectionsRef.current.get(oldestTarget)
            if (oldConnection) {
              try {
                oldConnection.close()
              } catch (err) {
                console.warn(`Error closing oldest peer connection:`, err)
              }
              peerConnectionsRef.current.delete(oldestTarget)
            }
          }
        }
        
        // Create a new RTCPeerConnection  
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 5 // Reduced from 10 to 5
        })
        
        // Add local tracks to the peer connection
        if (localStreamRef.current) {
          console.log('Adding tracks to peer connection:', 
            localStreamRef.current.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '))
          
          localStreamRef.current.getTracks().forEach(track => {
            if (localStreamRef.current) {
              peerConnection.addTrack(track, localStreamRef.current)
              console.log(`Added ${track.kind} track to peer connection`)
              
              // Ensure track is enabled based on current state
              if (track.kind === 'video' && !videoEnabled) {
                track.enabled = false
              } else if (track.kind === 'audio' && !audioEnabled) {
                track.enabled = false
              }
            }
          })
        } else {
          console.error('No local stream available')
          return
        }
        
        // Set up event handlers
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`Sending ICE candidate to viewer: ${target}`)
            socket.emit('ice-candidate', {
              target,
              candidate: event.candidate
            })
          }
        }
        
        peerConnection.oniceconnectionstatechange = () => {
          console.log(`ICE connection state for ${target}: ${peerConnection.iceConnectionState}`)
          
          // Clean up closed connections
          if (peerConnection.iceConnectionState === 'disconnected' || 
              peerConnection.iceConnectionState === 'failed' ||
              peerConnection.iceConnectionState === 'closed') {
            console.log(`Peer connection to ${target} closed or failed`)
            peerConnectionsRef.current.delete(target)
            
            // Update viewer count if a connection is lost
            setViewerCount(peerConnectionsRef.current.size)
          }
        }
        
        // Create and set local description (offer)
        console.log('Creating offer')
        const offer = await peerConnection.createOffer()
        console.log('Setting local description')
        await peerConnection.setLocalDescription(offer)
        
        // Wait for ICE gathering to complete or timeout after 2 seconds
        console.log('Waiting for ICE gathering to complete')
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (peerConnection.iceGatheringState === 'complete') {
              console.log('ICE gathering complete')
              resolve()
            }
          }
          
          // Check immediately
          checkState()
          
          // Set up event listener
          peerConnection.onicegatheringstatechange = () => {
            console.log(`ICE gathering state changed: ${peerConnection.iceGatheringState}`)
            checkState()
          }
          
          // Set timeout
          setTimeout(() => {
            console.log('ICE gathering timeout, continuing anyway')
            resolve()
          }, 2000)
        })
        
        // Send the offer to the viewer
        console.log('Sending offer to viewer')
        socket.emit('offer', {
          target,
          offer: peerConnection.localDescription
        })
        
        // Store the peer connection
        peerConnectionsRef.current.set(target, peerConnection)
        console.log(`Active connections: ${peerConnectionsRef.current.size}`)
      } catch (err) {
        console.error('Error creating offer:', err)
      }
    }
    
    // Handle answer from viewer
    const handleAnswer = ({ from, answer }: { from: string, answer: RTCSessionDescriptionInit }) => {
      const peerConnection = peerConnectionsRef.current.get(from)
      
      if (peerConnection && 
          peerConnection.signalingState !== 'closed' && 
          peerConnection.signalingState === 'have-local-offer') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => console.log(`Set remote description for ${from}`))
          .catch(err => console.error('Error setting remote description:', err))
      } else {
        console.log(`Cannot set answer from ${from}, connection state: ${peerConnection?.signalingState || 'null'}`)
      }
    }
    
    // Handle ICE candidate from viewer
    const handleIceCandidate = ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const peerConnection = peerConnectionsRef.current.get(from)
      
      if (peerConnection && 
          peerConnection.signalingState !== 'closed' && 
          peerConnection.remoteDescription) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => console.error('Error adding ICE candidate:', err))
      } else {
        console.log(`Cannot add ICE candidate from ${from}, connection state: ${peerConnection?.signalingState || 'null'}`)
      }
    }
    
    // Handle error
    const handleError = ({ message }: { message: string }) => {
      setError(message)
    }

    // Handle join requests from viewers
    const handleJoinRequest = (request: JoinRequest) => {
      console.log('Received join request from:', request.username)
      setJoinRequests(prev => [...prev, request])
    }

    // Handle co-streamer joined
    const handleCoStreamerJoined = ({ username: coStreamerName, socketId }: { username: string, socketId: string }) => {
      console.log(`Co-streamer joined: ${coStreamerName}`)
      setCoStreamers(prev => [
        ...prev.filter(cs => cs.username !== coStreamerName),
        { username: coStreamerName, socketId }
      ])
    }

    // Handle co-streamer offer
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

    // Handle co-streamer ice candidate
    const handleCoStreamerIceCandidate = ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const pc = coStreamerPeerConnections.current.get(from)
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }


    
    // Register event listeners
    socket.on('viewer-joined', handleViewerJoined)
    socket.on('viewer-count', handleViewerCount)
    socket.on('request-offer', handleRequestOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('join-request', handleJoinRequest)
    socket.on('co-streamer-joined', handleCoStreamerJoined)
    socket.on('co-streamer-offer', handleCoStreamerOffer)
    socket.on('co-streamer-ice-candidate', handleCoStreamerIceCandidate)
    socket.on('error', handleError)
    
    // Cleanup on unmount
    return () => {
      socket.off('viewer-joined', handleViewerJoined)
      socket.off('viewer-count', handleViewerCount)
      socket.off('request-offer', handleRequestOffer)
      socket.off('answer', handleAnswer)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('join-request', handleJoinRequest)
      socket.off('co-streamer-joined', handleCoStreamerJoined)
      socket.off('co-streamer-offer', handleCoStreamerOffer)
      socket.off('co-streamer-ice-candidate', handleCoStreamerIceCandidate)
      socket.off('error', handleError)
      
      // Clean up co-streamer peer connections
      coStreamerPeerConnections.current.forEach(pc => pc.close())
      coStreamerPeerConnections.current.clear()
      
      // Stop streaming if active
      if (isStreaming) {
        stopStream()
      }
    }
  }, [socket, isStreaming, navigate])
  
  // Handle chat room joining separately to avoid excessive requests
  const initialChatRequestRef = useRef(false)
  
  useEffect(() => {
    // Only make the request once when streaming starts or if streamId changes
    if (socket && isStreaming && streamId && !initialChatRequestRef.current) {
      console.log(`Ensuring broadcaster is in chat room for stream: ${streamId}`)
      socket.emit('get-chat-messages', { streamId })
      initialChatRequestRef.current = true
    }
    
    // Reset the ref when streaming stops
    if (!isStreaming) {
      initialChatRequestRef.current = false
    }
  }, [socket, isStreaming, streamId])

  return (
    <div className="cs-container">
      {/* Stream metadata form before streaming starts */}
      {!isStreaming ? (
        <div className="cs-setup-container">
          {showMetadataForm ? (
            <>
              {/* Header */}
              <div className="cs-setup-header">
                <h1>Set Up Your Stream</h1>
                <p>Provide details about your stream before going live</p>
              </div>
              
              <form onSubmit={handleMetadataSubmit} className="cs-setup-content">
                {error && (
                  <div className="cs-error">
                    {error}
                  </div>
                )}
                
                {/* Title */}
                <div className="cs-form-group">
                  <label htmlFor="title">Stream Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={streamMetadata.title}
                    onChange={(e) => setStreamMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter an engaging title for your stream"
                    required
                  />
                </div>

                {/* Description */}
                <div className="cs-form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={streamMetadata.description}
                    onChange={(e) => setStreamMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what your stream is about..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="cs-form-help">
                    {streamMetadata.description.length}/500 characters
                  </p>
                </div>

                {/* Category */}
                <div className="cs-form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={streamMetadata.category}
                    onChange={(e) => setStreamMetadata(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stream ID */}
                <div className="cs-form-group">
                  <label htmlFor="streamId">Stream ID (optional)</label>
                  <input
                    type="text"
                    id="streamId"
                    value={streamId}
                    onChange={(e) => setStreamId(e.target.value)}
                    placeholder="Leave empty for random ID"
                  />
                  <p className="cs-form-help">
                    This will be used in the stream URL
                  </p>
                </div>

                <div className="cs-setup-actions">
                  <button
                    type="submit"
                    className="cs-btn cs-btn-primary"
                  >
                    Continue to Stream Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="cs-btn cs-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Stream Preview */}
              <div className="cs-setup-header">
                <h1>Ready to Stream</h1>
                <p>Review your stream details and start broadcasting</p>
              </div>
              
              <div className="cs-setup-content">
                {error && (
                  <div className="cs-error">
                    {error}
                  </div>
                )}
                
                {/* Stream Preview */}
                <div className="cs-stream-preview">
                  <div className="cs-preview-thumbnail">
                    <div className="cs-default-thumbnail">
                      <span className="category-icon">{getCategoryIcon(streamMetadata.category)}</span>
                    </div>
                  </div>
                  <div className="cs-preview-info">
                    <h3>{streamMetadata.title}</h3>
                    <p className="cs-preview-category">
                      <span className="category-icon">{getCategoryIcon(streamMetadata.category)}</span>
                      <span>{streamMetadata.category}</span>
                    </p>
                    {streamMetadata.description && (
                      <p className="cs-preview-description">{streamMetadata.description}</p>
                    )}
                    <p className="cs-preview-id">Stream ID: {streamId || 'Auto-generated'}</p>
                  </div>
                </div>

                <div className="cs-setup-actions">
                  <button
                    onClick={startStream}
                    className="cs-btn cs-btn-primary"
                  >
                    🚀 Go Live
                  </button>
                  <button
                    onClick={() => setShowMetadataForm(true)}
                    className="cs-btn cs-btn-secondary"
                  >
                    ← Edit Details
                  </button>
                  <button
                    onClick={createTestStream}
                    className="cs-btn cs-btn-warning"
                  >
                    Create Test Stream
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Streaming interface after streaming starts - Match WatchStream layout
        <div className="cs-new-layout">
          {/* Stream Video - Full Width */}
          <div className="cs-video-container">
            <div className={`video-layout ${coStreamers.length > 0 ? 'split-screen' : 'single-screen'}`}>
              {/* Main broadcaster video */}
              <div className="main-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="cs-local-video"
                />
                
                {!videoEnabled && (
                  <div className="cs-video-disabled-overlay">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <p>Video is disabled</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Co-streamer videos */}
              {coStreamers.length > 0 && (
                <div className="co-streamer-section">
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
                      <div className="video-controls">
                        <button 
                          className="control-btn kick-btn"
                          onClick={() => handleKickCoStreamer(coStreamer.username)}
                          title={`Kick ${coStreamer.username}`}
                        >
                          🚫
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content Row - Info and Chat Side by Side */}
          <div className="cs-content-row">
            {/* Main Content Area */}
            <div className="cs-main-content">
              {/* Stream Info and Stats */}
              <div className="cs-info-section">
                {/* Stream Info */}
                <div className="cs-stream-info">
                  <div className="cs-stream-header">
                    <div className="cs-stream-details">
                      <h2 className="cs-stream-title">{streamMetadata.title || 'Live Stream'}</h2>
                      <div className="cs-stream-category">
                        <span className="category-icon">{getCategoryIcon(streamMetadata.category)}</span>
                        <span>{streamMetadata.category}</span>
                      </div>
                      {streamMetadata.description && (
                        <p className="cs-stream-description">{streamMetadata.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="cs-stream-metadata">
                    <div className="cs-live-indicator">
                      <span className="cs-live-badge">LIVE</span>
                    </div>
                    <div className="cs-viewers">
                      👥 {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
                    </div>
                  </div>
                  <div className="cs-stream-id">
                    Stream ID: <span>{streamId}</span>
                  </div>
                </div>

                {/* Stream Stats */}
                <div className="cs-stream-stats">
                  <h3>Stream Statistics</h3>
                  <div className="cs-stats-grid">
                    <div className="cs-stat-item">
                      <div className="cs-stat-label">Resolution</div>
                      <div className="cs-stat-value">{streamStats.resolution}</div>
                    </div>
                    <div className="cs-stat-item">
                      <div className="cs-stat-label">Frame Rate</div>
                      <div className="cs-stat-value">{streamStats.frameRate} fps</div>
                    </div>
                    <div className="cs-stat-item">
                      <div className="cs-stat-label">Viewers</div>
                      <div className="cs-stat-value">{viewerCount}</div>
                    </div>
                  </div>
                </div>

                {/* Stream Controls */}
                <div className="cs-stream-controls">
                  <h3>Stream Controls</h3>
                  <div className="cs-controls-grid">
                    <button
                      onClick={toggleVideo}
                      className={`cs-control-btn ${videoEnabled ? 'enabled' : 'disabled'}`}
                    >
                      {videoEnabled ? '📹 Disable Video' : '📹 Enable Video'}
                    </button>
                    
                    <button
                      onClick={toggleAudio}
                      className={`cs-control-btn ${audioEnabled ? 'enabled' : 'disabled'}`}
                    >
                      {audioEnabled ? '🎤 Disable Audio' : '🎤 Enable Audio'}
                    </button>
                    
                    <button
                      onClick={restartVideo}
                      className="cs-control-btn action"
                    >
                      🔄 Restart Video
                    </button>
                  </div>
                  
                  <button
                    onClick={stopStream}
                    className="cs-stop-stream-btn"
                  >
                    🛑 Stop Streaming
                  </button>
                </div>

                {/* Share Link */}
                <div className="cs-share-section">
                  <h3>Share Your Stream</h3>
                  <div className="cs-share-link">
                    {window.location.origin}/view/{streamId}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat component for the streamer */}
            <div className="cs-chat-sidebar">
              <Chat 
                username={username}
                streamId={streamId}
                socket={socket}
                hasJoined={false}
                hasRequestedJoin={false}
                onRequestJoin={() => {}}
                cameraEnabled={videoEnabled}
                micEnabled={audioEnabled}
                onCameraToggle={toggleVideo}
                onMicToggle={toggleAudio}
              />
            </div>
          </div>
        </div>
      )}

      {/* Join Request Popups for Streamer */}
      {isStreaming && joinRequests.map((request) => (
        <div key={request.username} className="cs-join-request-popup">
          <div className="cs-popup-content">
            <h4>Join Request</h4>
            <p><strong>{request.username}</strong> wants to join your stream</p>
            <div className="cs-popup-actions">
              <button 
                className="cs-accept-btn"
                onClick={() => handleJoinRequestResponse(request.username, true)}
              >
                Accept
              </button>
              <button 
                className="cs-reject-btn"
                onClick={() => handleJoinRequestResponse(request.username, false)}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CreateStream 