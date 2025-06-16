import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import ReligiousCitationSearch from './ReligiousCitationSearch'
import '../css/Chat.css'

interface SearchResult {
  text: string;
  reference: string;
  source: string;
}

interface ChatMessage {
  username: string
  message: string
  timestamp: number
  isSystem?: boolean
}

interface ChatProps {
  username: string
  streamId: string
  socket: Socket
  hasJoined?: boolean
  hasRequestedJoin?: boolean
  onRequestJoin?: () => void
  cameraEnabled?: boolean
  micEnabled?: boolean
  onCameraToggle?: () => void
  onMicToggle?: () => void
  onLeaveCoStreaming?: () => void
}

// Common offensive words to filter
const PROFANITY_LIST = [
  'ass', 'asshole', 'bitch', 'cunt', 'damn', 'fuck', 'shit', 'bastard',
  'dick', 'piss', 'nigger', 'nigga', 'retard', 'faggot', 'fag', 'whore'
];

const Chat = ({ username, streamId, socket, hasJoined, hasRequestedJoin, onRequestJoin, cameraEnabled, micEnabled, onCameraToggle, onMicToggle, onLeaveCoStreaming }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCitationSearch, setShowCitationSearch] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [broadcaster, setBroadcaster] = useState<string | null>(null)
  const [warningCount, setWarningCount] = useState(0)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timeoutRemaining, setTimeoutRemaining] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const citationButtonRef = useRef<HTMLButtonElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Scroll to the bottom of the chat whenever new messages come in
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
        setUnreadCount(0)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  // Track chat container focus
  useEffect(() => {
    const handleFocus = () => {
      setIsVisible(true)
      setUnreadCount(0)
    }
    
    const handleBlur = () => {
      setIsVisible(false)
    }
    
    // Add click event to the chat container to focus it
    const handleClick = () => {
      if (isVisible) {
        setUnreadCount(0)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    const chatContainer = chatContainerRef.current
    if (chatContainer) {
      chatContainer.addEventListener('click', handleClick)
    }
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      
      if (chatContainer) {
        chatContainer.removeEventListener('click', handleClick)
      }
    }
  }, [isVisible])
  
  // Update document title when new messages arrive and chat is not focused
  useEffect(() => {
    if (messages.length > 0 && !isVisible) {
      const latestMessage = messages[messages.length - 1]
      
      // Increment unread count for new messages (not system messages)
      if (!latestMessage.isSystem) {
        setUnreadCount(prevCount => prevCount + 1)
      }
    }
  }, [messages, isVisible])
  
  // Handle document title updates separately to avoid render loops
  useEffect(() => {
    // Update document title with unread count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Chat - Livestream`
    } else {
      document.title = 'Livestream'
    }
    
    // Reset unread count when chat gains focus
    if (isVisible && unreadCount > 0) {
      setUnreadCount(0)
    }
  }, [unreadCount, isVisible])
  
  // Handle clicking outside citation search to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showCitationSearch && 
        citationButtonRef.current && 
        !citationButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.citation-search-container')
      ) {
        setShowCitationSearch(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCitationSearch])
  
  // Handle timeout countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isTimedOut && timeoutRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeoutRemaining(prev => {
          if (prev <= 1) {
            setIsTimedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimedOut, timeoutRemaining]);
  
  // Load initial chat messages and setup event listeners
  useEffect(() => {
    console.log('Loading chat for stream:', streamId, 'as user:', username)
    
    const handleChatMessages = ({ messages, broadcaster }: { messages: ChatMessage[], broadcaster?: string }) => {
      console.log(`Received chat history for stream ${streamId}:`, messages.length, 'messages')
      if (messages.length > 0) {
        console.log('First message:', messages[0])
        console.log('Last message:', messages[messages.length - 1])
      }
      
      // Store broadcaster info if provided
      if (broadcaster) {
        console.log(`Broadcaster for stream ${streamId} is:`, broadcaster)
        setBroadcaster(broadcaster)
      }
      
      // Ensure all messages have the required properties
      const validMessages = messages.map(msg => ({
        username: typeof msg.username === 'string' ? msg.username : 'Unknown',
        message: typeof msg.message === 'string' ? msg.message : (msg.message?.message || String(msg.message || '')),
        timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
        isSystem: Boolean(msg.isSystem)
      }))
      
      setMessages(validMessages)
    }
    
    const handleChatMessage = (message: ChatMessage) => {
      console.log(`Received new chat message in stream ${streamId}:`, message)
      // Ensure the message has all required properties
      const validMessage = {
        username: typeof message.username === 'string' ? message.username : 'Unknown',
        message: typeof message.message === 'string' ? message.message : (message.message?.message || String(message.message || '')),
        timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
        isSystem: Boolean(message.isSystem)
      }
      setMessages(prev => [...prev, validMessage])
    }
    
    const handleViewerJoined = ({ username: joinedUser }: { username: string }) => {
      console.log(`Viewer joined stream ${streamId}:`, joinedUser)
      const systemMessage: ChatMessage = {
        username: 'System',
        message: `${joinedUser} joined the stream`,
        timestamp: Date.now(),
        isSystem: true
      }
      setMessages(prev => [...prev, systemMessage])
    }
    
    const handleViewerLeft = ({ username: leftUser }: { username: string }) => {
      console.log(`Viewer left stream ${streamId}:`, leftUser)
      const systemMessage: ChatMessage = {
        username: 'System',
        message: `${leftUser} left the stream`,
        timestamp: Date.now(),
        isSystem: true
      }
      setMessages(prev => [...prev, systemMessage])
    }
    
    const handleError = ({ message }: { message: string }) => {
      console.error(`Chat error for stream ${streamId}:`, message)
      setError(message)
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
    
    // Request chat history only once when component mounts
    console.log(`Requesting chat history for stream ${streamId}`)
    socket.emit('get-chat-messages', { streamId })
    
    // Setup event listeners
    socket.on('chat-messages', handleChatMessages)
    socket.on('chat-message', handleChatMessage)
    socket.on('viewer-joined', handleViewerJoined)
    socket.on('viewer-left', handleViewerLeft)
    socket.on('error', handleError)
    
    // Cleanup
    return () => {
      console.log(`Cleaning up chat component for stream ${streamId}`)
      socket.off('chat-messages', handleChatMessages)
      socket.off('chat-message', handleChatMessage)
      socket.off('viewer-joined', handleViewerJoined)
      socket.off('viewer-left', handleViewerLeft)
      socket.off('error', handleError)
    }
  }, [streamId, socket, username])
  
  // Check if message contains profanity
  const containsProfanity = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);
    
    // Check exact matches
    for (const word of words) {
      // Remove common punctuation for comparison
      const cleanWord = word.replace(/[.,!?;:'"(){}[\]]/g, '');
      if (PROFANITY_LIST.includes(cleanWord)) {
        return true;
      }
    }
    
    // Check for partial matches (to catch attempts to bypass filter)
    for (const badWord of PROFANITY_LIST) {
      // Look for words that might contain profanity with special chars inserted
      // e.g. "f*ck" or "f.u.c.k"
      const regex = new RegExp(badWord.split('').join('[^a-zA-Z0-9]*'), 'i');
      if (regex.test(lowerMessage)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Handle user timeout
  const timeoutUser = () => {
    setWarningCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setIsTimedOut(true);
        setTimeoutRemaining(30); // 30 second timeout
        return 0; // Reset warning count after timeout
      }
      return newCount;
    });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim() || isTimedOut) return
    
    // Check for profanity
    if (containsProfanity(messageInput)) {
      timeoutUser();
      setError('Your message contains inappropriate language. Please keep the chat respectful.');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Send message to server
    const newMessage: ChatMessage = {
      username,
      message: messageInput.trim(),
      timestamp: Date.now()
    };
    
    socket.emit('send-chat-message', {
      streamId,
      message: newMessage
    });
    
    // Clear input
    setMessageInput('')
    
    // Close citation search if open
    setShowCitationSearch(false)
  }
  
  // Toggle citation search
  const toggleCitationSearch = () => {
    setShowCitationSearch(prev => !prev)
  }
  
  // Handle citation selection
  const handleSelectCitation = (citation: SearchResult) => {
    const citationText = `${citation.reference}: "${citation.text}" [${citation.source}]`;
    setMessageInput(prev => prev + citationText);
  }
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Check if a username is the broadcaster
  const isBroadcaster = (msgUsername: string) => {
    return broadcaster && msgUsername === broadcaster
  }
  
  return (
    <div ref={chatContainerRef} className="chat-container">
      <div className="chat-header">
        <h3 className="chat-title">Live Chat</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount}
          </span>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isTimedOut && (
        <div className="timeout-message">
          You are timed out. You can send messages again in {timeoutRemaining} seconds.
        </div>
      )}
      
      {!isTimedOut && warningCount > 0 && (
        <div className="warning-message">
          Warning status: {warningCount}/3
        </div>
      )}
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Be the first to say something!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${!msg.isSystem && msg.username === username ? 'user-message' : ''}`}>
              {msg.isSystem ? (
                <div className="system-message">
                  <span className="system-message-badge">
                    {typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)}
                  </span>
                </div>
              ) : (
                <div 
                  className={`message-bubble ${
                    msg.username === username 
                      ? 'user' 
                      : isBroadcaster(msg.username)
                        ? 'broadcaster'
                        : 'other'
                  }`}
                >
                  <div className="message-header">
                    <span className={`message-username ${isBroadcaster(msg.username) ? 'broadcaster' : ''}`}>
                      {isBroadcaster(msg.username) && (
                        <span className="host-badge">
                          HOST
                        </span>
                      )}
                      {msg.username}
                    </span>
                    <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="message-text">{typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Action Buttons */}
      <div className="action-buttons">
        {!hasJoined && (
          <button 
            className="join-button"
            onClick={onRequestJoin}
            disabled={hasRequestedJoin}
          >
            {hasRequestedJoin ? '⏳ Request Sent' : '🤝 Request to Join'}
          </button>
        )}
        
        {/* User controls when joined */}
        {hasJoined && (
          <div className="user-controls">
            <div className="controls-grid">
              <button 
                className={`control-button ${cameraEnabled ? 'enabled' : 'disabled'}`}
                onClick={onCameraToggle}
              >
                {cameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
              </button>
              <button 
                className={`control-button ${micEnabled ? 'enabled' : 'disabled'}`}
                onClick={onMicToggle}
              >
                {micEnabled ? '🎤 Mic On' : '🔇 Mic Off'}
              </button>
            </div>
            <button 
              className="leave-button"
              onClick={onLeaveCoStreaming}
            >
              🚪 Leave Co-Streaming
            </button>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="message-form">
        <div className="citation-button-container">
          <button
            type="button"
            ref={citationButtonRef}
            onClick={toggleCitationSearch}
            className="citation-button"
            disabled={isTimedOut}
          >
            <span className="citation-icon">📚</span> Find Qoute
          </button>
        </div>
        
        <div className="input-container">
          {showCitationSearch && (
            <div className="citation-search-container">
              <ReligiousCitationSearch 
                onSelectCitation={handleSelectCitation}
                onClose={() => setShowCitationSearch(false)}
              />
            </div>
          )}
          
          <div className="input-row">
            <div className="input-wrapper">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="message-input"
                placeholder={isTimedOut ? "You are timed out..." : "Type a message..."}
                maxLength={500}
                disabled={isTimedOut}
              />
            </div>
            <button
              type="submit"
              className={`send-button ${isTimedOut ? 'disabled' : 'enabled'}`}
              disabled={isTimedOut}
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Chat 