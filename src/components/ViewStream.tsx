import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Socket } from 'socket.io-client'

interface ViewStreamProps {
  username: string
  socket: Socket
}

const ViewStream = ({ username, socket }: ViewStreamProps) => {
  const { streamId } = useParams<{ streamId: string }>()
  const [broadcaster, setBroadcaster] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [tracksReceived, setTracksReceived] = useState<{ audio: boolean, video: boolean }>({ audio: false, video: false })
  const [videoVisible, setVideoVisible] = useState<boolean>(false)
  const [connectionState, setConnectionState] = useState<string>('connecting')
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const playAttemptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const navigate = useNavigate()

  // Function to handle remote stream
  const handleRemoteStream = () => {
    if (!remoteStreamRef.current || !remoteVideoRef.current) {
      console.warn('Cannot handle remote stream: missing references')
      return
    }
    
    console.log('Handling remote stream with tracks:', 
      remoteStreamRef.current.getTracks().map(t => `${t.kind}:${t.enabled ? 'enabled' : 'disabled'}`).join(', '))
    
    // Set the stream as the video source
    remoteVideoRef.current.srcObject = null // Clear first to force refresh
    
    // Set the stream after a short delay to ensure DOM updates
    setTimeout(() => {
      if (remoteVideoRef.current && remoteStreamRef.current) {
        console.log('Setting srcObject on video element')
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        
        // Only try to play if we have at least one track
        if (remoteStreamRef.current.getTracks().length > 0) {
          // Clear any existing timeout
          if (playAttemptTimeoutRef.current) {
            clearTimeout(playAttemptTimeoutRef.current)
          }
          
          // Make immediate first attempt to play
          if (remoteVideoRef.current.paused) {
            console.log('Immediate play attempt')
            remoteVideoRef.current.play()
              .then(() => {
                console.log('Immediate play successful')
                setIsConnected(true)
                setVideoVisible(true)
                setError('')
              })
              .catch(err => {
                console.warn('Immediate play failed, will try again with delay:', err)
                // Will try again with the delayed attempt below
              })
          }
          
          // Wait a short time before attempting to play again to allow all tracks to be added
          playAttemptTimeoutRef.current = setTimeout(() => {
            if (remoteVideoRef.current && remoteVideoRef.current.paused) {
              console.log('Delayed play attempt')
              
              // Make sure video is visible
              setVideoVisible(true)
              
              // Add a retry mechanism for playback
              const attemptPlayback = (retryCount = 0) => {
                if (retryCount >= 3) {
                  console.error('Max playback retry attempts reached')
                  setError('Could not start video playback. Please try refreshing.')
                  return
                }

                remoteVideoRef.current?.play()
                  .then(() => {
                    console.log('Video playback started successfully')
                    setIsConnected(true)
                    setError('')
                  })
                  .catch(err => {
                    console.error(`Error playing video (attempt ${retryCount + 1}):`, err)
                    // Try again with a delay
                    setTimeout(() => attemptPlayback(retryCount + 1), 1000)
                  })
              }

              attemptPlayback()
            }
          }, 1000) // Wait 1 second to collect tracks before playing
        } else {
          console.warn('No tracks in remote stream')
          setError('No media tracks received. Please try refreshing.')
        }
      }
    }, 100)
  }

  // Check video dimensions periodically
  useEffect(() => {
    if (!isConnected || !remoteVideoRef.current) return
    
    const checkVideoDimensions = () => {
      if (remoteVideoRef.current) {
        const { videoWidth, videoHeight } = remoteVideoRef.current
        console.log(`Video dimensions: ${videoWidth}x${videoHeight}`)
        
        if (videoWidth === 0 || videoHeight === 0) {
          console.warn('Video dimensions are zero, video might not be displaying correctly')
          // Try to refresh the video if dimensions are zero
          if (remoteStreamRef.current && remoteStreamRef.current.getVideoTracks().length > 0) {
            handleRefreshVideo()
          }
        } else {
          console.log('Video dimensions look good')
          setVideoVisible(true)
        }
      }
    }
    
    // Check dimensions after a short delay
    const timer = setTimeout(checkVideoDimensions, 2000)
    
    return () => clearTimeout(timer)
  }, [isConnected])

  // Reconnect if needed
  useEffect(() => {
    if (connectionState === 'failed' && streamId) {
      console.log('Connection failed, attempting to reconnect...')
      
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      // Wait a bit before reconnecting
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Reconnecting to stream...')
        socket.emit('join-stream', { streamId, username })
        setConnectionState('connecting')
      }, 5000)
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectionState, streamId, username, socket])

  useEffect(() => {
    console.log('Initializing ViewStream component')
    
    // Join the stream
    if (streamId) {
      console.log(`Joining stream: ${streamId}`)
      socket.emit('join-stream', { streamId, username })
    }

    // Setup an automatic retry if no connection is established within 10 seconds
    const initialConnectionTimeout = setTimeout(() => {
      if (!isConnected && remoteVideoRef.current?.paused) {
        console.log('No connection established after 10 seconds, trying to reconnect...')
        handleRestartConnection()
      }
    }, 10000)

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
      try {
        // Store broadcaster info
        const activeStreams = await new Promise<any[]>((resolve) => {
          socket.emit('get-active-streams')
          socket.once('active-streams', resolve)
        })
        
        const stream = activeStreams.find(s => s.streamId === streamId)
        if (stream) {
          setBroadcaster(stream.broadcaster)
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
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => console.log('Added ICE candidate successfully'))
          .catch(err => {
            console.error('Error adding ICE candidate:', err)
          })
      } else {
        console.warn('Cannot add ICE candidate: peer connection is closed or null')
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
    socket.on('stream-ended', handleStreamEnded)
    socket.on('error', handleError)

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up ViewStream component')
      socket.off('stream-not-found', handleStreamNotFound)
      socket.off('offer', handleOffer)
      socket.off('ice-candidate', handleIceCandidate)
      socket.off('stream-ended', handleStreamEnded)
      socket.off('error', handleError)
      
      clearTimeout(initialConnectionTimeout)
      
      // Clear any pending timeouts
      if (playAttemptTimeoutRef.current) {
        clearTimeout(playAttemptTimeoutRef.current)
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        try {
          if (peerConnectionRef.current.signalingState !== 'closed') {
            peerConnectionRef.current.getSenders().forEach(sender => {
              if (sender.track) {
                sender.track.stop()
              }
            })
            peerConnectionRef.current.close()
            console.log('Peer connection closed')
          }
        } catch (err) {
          console.error('Error closing peer connection:', err)
        }
        peerConnectionRef.current = null
      }
      
      // Clear video source
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
        console.log('Cleared video source')
      }
      
      // Clear remote stream
      remoteStreamRef.current = null
    }
  }, [socket, streamId, username, navigate])

  const handleOfferInternal = async (broadcasterId: string, offer: RTCSessionDescriptionInit) => {
    try {
      console.log('Processing offer from broadcaster')
      
      // Close any existing peer connection
      if (peerConnectionRef.current) {
        try {
          if (peerConnectionRef.current.signalingState !== 'closed') {
            peerConnectionRef.current.getSenders().forEach(sender => {
              if (sender.track) {
                sender.track.stop()
              }
            })
            peerConnectionRef.current.close()
            console.log('Closed existing peer connection')
          }
        } catch (err) {
          console.error('Error closing existing peer connection:', err)
        }
        peerConnectionRef.current = null
      }
      
      // Reset video state 
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      
      // Create a new MediaStream for remote tracks
      const remoteStream = new MediaStream()
      remoteStreamRef.current = remoteStream
      
      // Reset state
      setTracksReceived({ audio: false, video: false })
      setVideoVisible(false)
      setIsConnected(false)
      setConnectionState('connecting')
      
      // Create a new RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      })
      
      console.log('Created new peer connection')
      
      // Pre-set the remote stream to the video element to avoid race conditions
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      
      // Set up event handlers
      peerConnection.ontrack = (event) => {
        console.log('Track received:', event.track.kind, event.track)
        
        // Add track to remote stream
        remoteStream.addTrack(event.track)
        
        // Update tracks received state immediately
        if (event.track.kind === 'audio') {
          setTracksReceived(prev => ({ ...prev, audio: true }))
        } else if (event.track.kind === 'video') {
          setTracksReceived(prev => ({ ...prev, video: true }))
        }
        
        event.track.onunmute = () => {
          console.log('Track unmuted:', event.track.kind)
          
          // Update tracks received state
          if (event.track.kind === 'audio') {
            setTracksReceived(prev => ({ ...prev, audio: true }))
          } else if (event.track.kind === 'video') {
            setTracksReceived(prev => ({ ...prev, video: true }))
          }
          
          // Handle the remote stream update when track is unmuted
          handleRemoteStream()
        }
        
        // Delay the stream handling slightly to allow potential second track to arrive
        setTimeout(() => {
          console.log('Handling remote stream after short delay to collect tracks')
          handleRemoteStream()
        }, 500)
      }
      
      // Store the peer connection early to avoid race conditions
      peerConnectionRef.current = peerConnection
      
      // Monitor track changes
      peerConnection.onremovetrack = (event) => {
        console.log('Track removed:', event.track.kind)
        if (event.track.kind === 'audio') {
          setTracksReceived(prev => ({ ...prev, audio: false }))
        } else if (event.track.kind === 'video') {
          setTracksReceived(prev => ({ ...prev, video: false }))
        }
      }
      
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to broadcaster')
          socket.emit('ice-candidate', {
            target: broadcasterId,
            candidate: event.candidate
          })
        }
      }

      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState
        console.log(`ICE connection state changed: ${state}`)
        setConnectionState(state)
        
        if (state === 'failed' || state === 'disconnected') {
          console.warn('ICE connection failed or disconnected')
          if (!error) {
            setError('Connection lost. Trying to reconnect...')
          }
        } else if (state === 'connected') {
          setError('')
          console.log('ICE connected, checking for tracks...')
          console.log('Remote tracks:', peerConnection.getReceivers().map(r => r.track?.kind))
          
          // Force a stream refresh when ICE connects
          setTimeout(() => {
            console.log('Refreshing stream after ICE connected')
            if (remoteStreamRef.current) {
              handleRemoteStream()
            }
          }, 500) // Short delay to ensure connection is stable
        }
      }
      
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed: ${peerConnection.connectionState}`)
        if (peerConnection.connectionState === 'connected') {
          // Force a stream refresh when connection is established
          setTimeout(() => {
            console.log('Refreshing stream after connection established')
            if (remoteStreamRef.current) {
              handleRemoteStream()
            }
          }, 500) // Short delay to ensure connection is stable
        }
      }
      
      peerConnection.onsignalingstatechange = () => {
        console.log(`Signaling state changed: ${peerConnection.signalingState}`)
      }
      
      // Set the remote description (offer from broadcaster)
      console.log('Setting remote description (offer)')
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Create and set local description (answer)
      console.log('Creating answer')
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      
      console.log('Setting local description (answer)')
      await peerConnection.setLocalDescription(answer)
      
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
      
      // Send the answer to the broadcaster
      console.log('Sending answer to broadcaster')
      socket.emit('answer', {
        target: broadcasterId,
        answer: peerConnection.localDescription
      })
      
      // Set a timeout to check if we've received any tracks
      setTimeout(() => {
        if (remoteStreamRef.current && remoteStreamRef.current.getTracks().length === 0) {
          console.warn('No tracks received after 5 seconds')
          setError('No media received. Attempting to reconnect...')
          // Attempt to restart connection if no tracks received
          handleRestartConnection()
        }
      }, 5000)
    } catch (err) {
      console.error('Error in handleOfferInternal:', err)
      throw err
    }
  }

  // Handle manual video play
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

  // Force video refresh
  const handleRefreshVideo = () => {
    console.log('Refreshing video')
    
    if (remoteVideoRef.current && remoteStreamRef.current) {
      console.log('Refreshing video element')
      
      // Temporarily remove the stream
      remoteVideoRef.current.srcObject = null
      
      // Reset connection state
      setIsConnected(false)
      setVideoVisible(false)
      
      // Short timeout to ensure DOM updates
      setTimeout(() => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
          // Check if the stream has tracks
          const hasTracks = remoteStreamRef.current.getTracks().length > 0
          console.log(`Stream has ${remoteStreamRef.current.getTracks().length} tracks for refresh`)
          
          // Reattach the stream
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          
          if (hasTracks) {
            // Add a retry mechanism for playback
            const attemptPlayback = (retryCount = 0) => {
              if (retryCount >= 3) {
                console.error('Max playback retry attempts reached')
                setError('Could not start video playback. Please try refreshing.')
                return
              }

              remoteVideoRef.current?.play()
                .then(() => {
                  console.log('Video refreshed and playing')
                  setVideoVisible(true)
                  setIsConnected(true)
                  setError('')
                })
                .catch(err => {
                  console.error(`Error playing video after refresh (attempt ${retryCount + 1}):`, err)
                  // Try again with a delay
                  setTimeout(() => attemptPlayback(retryCount + 1), 1000)
                })
            }

            attemptPlayback()
          } else {
            console.warn('No tracks available for refresh, trying to reconnect')
            handleRestartConnection()
          }
        }
      }, 100)
    } else {
      console.log('No media stream available, reconnecting to stream')
      // If we don't have a stream, try reconnecting
      handleRestartConnection()
    }
  }

  // Completely restart the connection
  const handleRestartConnection = () => {
    console.log('Restarting connection')
    
    // Close existing peer connection
    if (peerConnectionRef.current) {
      try {
        if (peerConnectionRef.current.signalingState !== 'closed') {
          peerConnectionRef.current.close()
        }
      } catch (err) {
        console.error('Error closing peer connection:', err)
      }
      peerConnectionRef.current = null
    }
    
    // Clear video source
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    
    // Clear remote stream
    remoteStreamRef.current = null
    
    // Reset state
    setTracksReceived({ audio: false, video: false })
    setVideoVisible(false)
    setIsConnected(false)
    setConnectionState('connecting')
    setError('')
    
    // Rejoin the stream
    if (streamId) {
      socket.emit('join-stream', { streamId, username })
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">
          {broadcaster ? `${broadcaster}'s Stream` : 'Joining Stream...'}
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              {isConnected && (
                <span className="inline-block bg-red-500 text-white text-sm px-2 py-1 rounded-full mr-2">
                  LIVE
                </span>
              )}
              <span className="text-gray-600">
                Connection: {connectionState}
                {isConnected && ` | ${tracksReceived.video ? 'Video' : 'No Video'} | ${tracksReceived.audio ? 'Audio' : 'No Audio'}`}
              </span>
            </div>
            <button 
              onClick={handleRefreshVideo}
              className="text-sm bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
            >
              Refresh Video
            </button>
          </div>
          
          <div 
            ref={videoContainerRef}
            className="bg-black rounded-lg overflow-hidden aspect-video relative cursor-pointer" 
            onClick={handleVideoClick}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              controls
              muted={false}
              style={{ 
                display: videoVisible ? 'block' : 'none',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            
            {(!isConnected || !videoVisible) && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Connecting to stream...</p>
                  {isConnected && !videoVisible && (
                    <button 
                      onClick={handleVideoClick}
                      className="mt-4 bg-indigo-600 text-white py-1 px-4 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Click to Play
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition"
          >
            Back to Streams
          </button>
          
          <button
            onClick={handleRefreshVideo}
            className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
          >
            Refresh Stream
          </button>
          
          <button
            onClick={handleRestartConnection}
            className="bg-yellow-600 text-white py-2 px-6 rounded-lg hover:bg-yellow-700 transition"
          >
            Restart Connection
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViewStream 