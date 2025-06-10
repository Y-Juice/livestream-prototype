import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import ReligiousCitationSearch from './ReligiousCitationSearch'

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
  onCiteSources?: () => void
  cameraEnabled?: boolean
  micEnabled?: boolean
  onCameraToggle?: () => void
  onMicToggle?: () => void
}

// Common offensive words to filter
const PROFANITY_LIST = [
  'ass', 'asshole', 'bitch', 'cunt', 'damn', 'fuck', 'shit', 'bastard',
  'dick', 'piss', 'nigger', 'nigga', 'retard', 'faggot', 'fag', 'whore'
];

const Chat = ({ username, streamId, socket, hasJoined, hasRequestedJoin, onRequestJoin, onCiteSources, cameraEnabled, micEnabled, onCameraToggle, onMicToggle }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState<string>('')
  const [showCitationSearch, setShowCitationSearch] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isChatFocused, setIsChatFocused] = useState(true)
  const [broadcaster, setBroadcaster] = useState<string>('')
  const [warningCount, setWarningCount] = useState(0)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timeoutEndTime, setTimeoutEndTime] = useState<number | null>(null)
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
      setIsChatFocused(document.visibilityState === 'visible')
      
      // Reset unread count when document becomes visible
      if (document.visibilityState === 'visible') {
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
      setIsChatFocused(true)
      setUnreadCount(0)
    }
    
    const handleBlur = () => {
      setIsChatFocused(false)
    }
    
    // Add click event to the chat container to focus it
    const handleClick = () => {
      setIsChatFocused(true)
      setUnreadCount(0)
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
  }, [])
  
  // Update document title when new messages arrive and chat is not focused
  useEffect(() => {
    if (messages.length > 0 && !isChatFocused) {
      const latestMessage = messages[messages.length - 1]
      
      // Increment unread count for new messages (not system messages)
      if (!latestMessage.isSystem) {
        setUnreadCount(prevCount => prevCount + 1)
      }
    }
  }, [messages, isChatFocused])
  
  // Handle document title updates separately to avoid render loops
  useEffect(() => {
    // Update document title with unread count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Chat - Livestream`
    } else {
      document.title = 'Livestream'
    }
    
    // Reset unread count when chat gains focus
    if (isChatFocused && unreadCount > 0) {
      setUnreadCount(0)
    }
  }, [unreadCount, isChatFocused])
  
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
    
    if (isTimedOut && timeoutEndTime) {
      intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((timeoutEndTime - Date.now()) / 1000));
        setTimeoutRemaining(remaining);
        
        if (remaining === 0) {
          setIsTimedOut(false);
          setTimeoutEndTime(null);
          if (intervalId) clearInterval(intervalId);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimedOut, timeoutEndTime]);
  
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
      
      setMessages(messages)
    }
    
    const handleChatMessage = (message: ChatMessage) => {
      console.log(`Received new chat message in stream ${streamId}:`, message)
      setMessages(prev => [...prev, message])
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
      setTimeout(() => setError(''), 5000)
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
    // Set timeout for 60 seconds (1 minute)
    const timeoutDuration = 60 * 1000;
    const endTime = Date.now() + timeoutDuration;
    
    setIsTimedOut(true);
    setTimeoutEndTime(endTime);
    setTimeoutRemaining(60);
    
    // Add system message showing timeout
    const systemMessage: ChatMessage = {
      username: 'System',
      message: `${username} has been timed out for 60 seconds due to multiple violations.`,
      timestamp: Date.now(),
      isSystem: true
    };
    
    setMessages(prev => [...prev, systemMessage]);
    
    // Auto reset warning count after timeout
    setTimeout(() => {
      setWarningCount(0);
    }, timeoutDuration);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim()) return
    
    // Check if user is timed out
    if (isTimedOut) {
      setError(`You are timed out for ${timeoutRemaining} more seconds.`);
      return;
    }
    
    // Check for profanity
    if (containsProfanity(messageInput)) {
      const newWarningCount = warningCount + 1;
      setWarningCount(newWarningCount);
      
      // Create warning message
      let warningMessage: string;
      
      if (newWarningCount >= 3) {
        warningMessage = `Warning (${newWarningCount}/3): Your message contains inappropriate language. You have been timed out for 60 seconds.`;
        timeoutUser();
      } else {
        warningMessage = `Warning (${newWarningCount}/3): Your message contains inappropriate language and was not sent.`;
      }
      
      setError(warningMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    // Send message to server
    socket.emit('send-chat-message', {
      streamId,
      message: messageInput.trim()
    })
    
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
    <div ref={chatContainerRef} className="bg-white rounded-lg shadow-md flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium">Live Chat</h3>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 m-2 rounded">
          {error}
        </div>
      )}
      
      {isTimedOut && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 m-2 rounded">
          You are timed out. You can send messages again in {timeoutRemaining} seconds.
        </div>
      )}
      
      {!isTimedOut && warningCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 m-2 rounded text-sm">
          Warning status: {warningCount}/3
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Be the first to say something!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex items-start space-x-2 ${!msg.isSystem && msg.username === username ? 'justify-end' : ''}`}>
              {msg.isSystem ? (
                <div className="w-full text-center">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {msg.message}
                  </span>
                </div>
              ) : (
                <div 
                  className={`
                    max-w-[80%] rounded-lg p-2 
                    ${msg.username === username 
                      ? 'bg-blue-100' 
                      : isBroadcaster(msg.username)
                        ? 'bg-purple-100 border border-purple-200' // Special style for broadcaster
                        : 'bg-gray-100'
                    }
                  `}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold text-sm ${isBroadcaster(msg.username) ? 'text-purple-700 flex items-center' : ''}`}>
                      {isBroadcaster(msg.username) && (
                        <span className="inline-block bg-purple-600 text-white text-xs px-1 mr-1 rounded">
                          HOST
                        </span>
                      )}
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Action Buttons */}
      <div className="p-3 border-t border-gray-200 space-y-2">
        {!hasJoined && (
          <button 
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={onRequestJoin}
            disabled={hasRequestedJoin}
          >
            {hasRequestedJoin ? '⏳ Request Sent' : '🤝 Request to Join'}
          </button>
        )}
        
        <button 
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition"
          onClick={onCiteSources}
        >
          📚 Cite Sources
        </button>

        {/* User controls when joined */}
        {hasJoined && (
          <div className="grid grid-cols-2 gap-2">
            <button 
              className={`py-2 px-4 rounded-lg font-medium transition ${
                cameraEnabled 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              onClick={onCameraToggle}
            >
              {cameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
            </button>
            <button 
              className={`py-2 px-4 rounded-lg font-medium transition ${
                micEnabled 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              onClick={onMicToggle}
            >
              {micEnabled ? '🎤 Mic On' : '🔇 Mic Off'}
            </button>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
        <div className="flex items-center mb-2">
          <button
            type="button"
            ref={citationButtonRef}
            onClick={toggleCitationSearch}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-lg text-sm flex items-center mr-2"
            disabled={isTimedOut}
          >
            <span className="mr-1">📚</span> Religious Citation
          </button>
        </div>
        
        <div className="relative">
          {showCitationSearch && (
            <div className="citation-search-container">
              <ReligiousCitationSearch 
                onSelectCitation={handleSelectCitation}
                onClose={() => setShowCitationSearch(false)}
              />
            </div>
          )}
          
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className={`w-full rounded-lg border ${isTimedOut ? 'bg-gray-100 border-gray-300' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400`}
                placeholder={isTimedOut ? "You are timed out..." : "Type a message..."}
                maxLength={500}
                disabled={isTimedOut}
              />
            </div>
            <button
              type="submit"
              className={`${isTimedOut ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
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