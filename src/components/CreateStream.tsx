import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import Chat from './Chat'
import CitationBox from './CitationBox'

interface CreateStreamProps {
  username: string
  socket: Socket
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
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const navigate = useNavigate()

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
        // First clear the video source to ensure refresh
        localVideoRef.current.srcObject = null
        
        // Short delay to ensure DOM updates
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Set the stream and play
        localVideoRef.current.srcObject = stream
        
        // Ensure video is playing with multiple attempts
        const attemptPlay = async (retries = 3) => {
          try {
            await localVideoRef.current?.play()
            console.log('Local video playing successfully')
          } catch (err) {
            console.error('Error playing local video:', err)
            if (retries > 0) {
              console.log(`Retrying playback, ${retries} attempts left`)
              setTimeout(() => attemptPlay(retries - 1), 500)
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
      
      // Notify server
      socket.emit('start-stream', { streamId: newStreamId })
      
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
      
      // Notify server of test stream creation
      socket.emit('start-stream', { streamId: testStreamId });
      
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
          const oldestTarget = peerConnectionsRef.current.keys().next().value
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
              const sender = peerConnection.addTrack(track, localStreamRef.current)
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
      
      if (peerConnection && peerConnection.signalingState !== 'closed') {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => console.log(`Set remote description for ${from}`))
          .catch(err => console.error('Error setting remote description:', err))
      }
    }
    
    // Handle ICE candidate from viewer
    const handleIceCandidate = ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const peerConnection = peerConnectionsRef.current.get(from)
      
      if (peerConnection && peerConnection.signalingState !== 'closed') {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => console.error('Error adding ICE candidate:', err))
      }
    }
    
    // Handle error
    const handleError = ({ message }: { message: string }) => {
      setError(message)
    }
    
    // Register event listeners
    socket.on('viewer-joined', handleViewerJoined)
    socket.on('viewer-count', handleViewerCount)
    socket.on('request-offer', handleRequestOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('error', handleError)
    
    // Cleanup on unmount
    return () => {
      socket.off('viewer-joined', handleViewerJoined)
      socket.off('viewer-count', handleViewerCount)
      socket.off('request-offer', handleRequestOffer)
      socket.off('answer', handleAnswer)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('error', handleError)
      
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
    <div className="max-w-4xl mx-auto">
      {/* Stream form before streaming starts */}
      {!isStreaming ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gray-50 border-b">
            <h1 className="text-2xl font-bold">Create Stream</h1>
            <p className="text-gray-600 mt-1">
              Start streaming to your audience
            </p>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="streamId" className="block text-gray-700 mb-2">
                Stream ID (optional)
              </label>
              <input
                type="text"
                id="streamId"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Leave empty for random ID"
              />
              <p className="text-gray-500 text-sm mt-1">
                This will be used in the stream URL
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={startStream}
                className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
              >
                Start Streaming
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={createTestStream}
                className="bg-yellow-500 text-white py-2 px-6 rounded-lg hover:bg-yellow-600 transition"
              >
                Create Test Stream
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Streaming interface after streaming starts
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:flex-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold">Live Stream</h1>
                    <div className="flex items-center mt-1">
                      <span className="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                        LIVE
                      </span>
                      <span className="text-gray-600 text-sm">
                        Stream ID: <span className="font-mono">{streamId}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 font-semibold">
                    {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
                  </div>
                </div>
              </div>
              
              <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 text-white">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <p>Video is disabled</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="mb-2 text-sm text-gray-600">
                  <div>Resolution: {streamStats.resolution}</div>
                  <div>Frame Rate: {streamStats.frameRate} fps</div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={toggleVideo}
                    className={`flex items-center py-2 px-4 rounded-lg transition ${
                      videoEnabled ? 'bg-gray-200 hover:bg-gray-300' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {videoEnabled ? 'Disable Video' : 'Enable Video'}
                  </button>
                  
                  <button
                    onClick={toggleAudio}
                    className={`flex items-center py-2 px-4 rounded-lg transition ${
                      audioEnabled ? 'bg-gray-200 hover:bg-gray-300' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {audioEnabled ? 'Disable Audio' : 'Enable Audio'}
                  </button>
                  
                  <button
                    onClick={restartVideo}
                    className="flex items-center py-2 px-4 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                  >
                    Restart Video
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={stopStream}
                    className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition"
                  >
                    Stop Streaming
                  </button>
                  
                  <div className="text-gray-600 text-sm">
                    Share link: 
                    <span className="font-mono bg-gray-100 p-1 rounded ml-1">
                      {window.location.origin}/view/{streamId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat and Citation components for the streamer */}
          <div className="w-full lg:w-96 space-y-4">
            <div className="h-[500px]">
              <Chat 
                username={username}
                streamId={streamId}
                socket={socket}
              />
            </div>
            <div className="h-[400px]">
              <CitationBox />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateStream 