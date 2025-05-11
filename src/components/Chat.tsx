import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

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
}

const Chat = ({ username, streamId, socket }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState<string>('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isChatFocused, setIsChatFocused] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
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
      
      // Update document title with unread count
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) Chat - Livestream`
      }
    }
    
    // Reset document title when chat gains focus
    if (isChatFocused && unreadCount > 0) {
      document.title = 'Livestream'
      setUnreadCount(0)
    }
  }, [messages, isChatFocused, unreadCount])
  
  // Handle clicking outside emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker && 
        emojiButtonRef.current && 
        !emojiButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.emoji-picker-react')
      ) {
        setShowEmojiPicker(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])
  
  // Load initial chat messages and setup event listeners
  useEffect(() => {
    console.log('Loading chat for stream:', streamId)
    
    const handleChatMessages = ({ messages }: { messages: ChatMessage[] }) => {
      console.log('Received chat history:', messages.length, 'messages')
      setMessages(messages)
    }
    
    const handleChatMessage = (message: ChatMessage) => {
      console.log('Received new chat message:', message)
      setMessages(prev => [...prev, message])
    }
    
    const handleViewerJoined = ({ username }: { username: string }) => {
      console.log('Viewer joined:', username)
      const systemMessage: ChatMessage = {
        username: 'System',
        message: `${username} joined the stream`,
        timestamp: Date.now(),
        isSystem: true
      }
      setMessages(prev => [...prev, systemMessage])
    }
    
    const handleViewerLeft = ({ username }: { username: string }) => {
      console.log('Viewer left:', username)
      const systemMessage: ChatMessage = {
        username: 'System',
        message: `${username} left the stream`,
        timestamp: Date.now(),
        isSystem: true
      }
      setMessages(prev => [...prev, systemMessage])
    }
    
    const handleError = ({ message }: { message: string }) => {
      console.error('Chat error:', message)
      setError(message)
      
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000)
    }
    
    // Request chat history
    socket.emit('get-chat-messages', { streamId })
    
    // Setup event listeners
    socket.on('chat-messages', handleChatMessages)
    socket.on('chat-message', handleChatMessage)
    socket.on('viewer-joined', handleViewerJoined)
    socket.on('viewer-left', handleViewerLeft)
    socket.on('error', handleError)
    
    // Cleanup
    return () => {
      socket.off('chat-messages', handleChatMessages)
      socket.off('chat-message', handleChatMessage)
      socket.off('viewer-joined', handleViewerJoined)
      socket.off('viewer-left', handleViewerLeft)
      socket.off('error', handleError)
    }
  }, [streamId, socket])
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim()) return
    
    // Send message to server
    socket.emit('send-chat-message', {
      streamId,
      message: messageInput.trim()
    })
    
    // Clear input
    setMessageInput('')
    
    // Close emoji picker if open
    setShowEmojiPicker(false)
  }
  
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput(prev => prev + emojiData.emoji)
  }
  
  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev)
  }
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                <div className={`max-w-[80%] rounded-lg p-2 ${msg.username === username ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">{msg.username}</span>
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
      
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
        <div className="relative">
          <div className="flex space-x-2">
            <div className="flex-1 flex relative">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Type a message..."
                maxLength={500}
              />
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={toggleEmojiPicker}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                😊
              </button>
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Send
            </button>
          </div>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                searchDisabled
                skinTonesDisabled
                width={300}
                height={400}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

export default Chat 