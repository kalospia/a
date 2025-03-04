
import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';
import EmojiPicker from 'emoji-picker-react';

// Error boundary to prevent the entire app from crashing
class ErrorBoundary extends Component<{children: ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error in component:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <button 
            onClick={() => {
              localStorage.clear();
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{
              padding: '10px 20px',
              margin: '20px 0',
              backgroundColor: '#4e4eff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Data & Restart
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

type User = 'R' | 'B' | null;
type ReadStatus = 'sent' | 'seen';

interface Message {
  id: string;
  text: string;
  sender: User;
  timestamp: Date;
  readStatus: ReadStatus;
  replyTo?: string;
  media?: string;
}

export { ErrorBoundary };

export default function App() {
  const [user, setUser] = useState<User>(() => {
    const savedUser = localStorage.getItem('chatUser');
    return savedUser === 'R' || savedUser === 'B' ? savedUser : null;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  
  // Simulate getting messages from a server
  useEffect(() => {
    // This would normally be a fetch to a server
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        // Convert string dates back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error("Error parsing stored messages:", e);
      }
    }
  }, []);

  // Save messages to localStorage (simulating a database)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Always keep only the last 30 messages to prevent quota issues
        const messagesToStore = messages.slice(-30);
        localStorage.setItem('chatMessages', JSON.stringify(messagesToStore));
      } catch (e) {
        console.warn("Could not save messages to localStorage. Storage quota may be exceeded.");
        
        // Try with even fewer messages if we still have issues
        try {
          const minimumMessages = messages.slice(-10);
          localStorage.setItem('chatMessages', JSON.stringify(minimumMessages));
        } catch (e) {
          // If still failing, clear storage and keep only the very latest messages
          localStorage.clear();
          console.warn("Cleared localStorage due to persistent quota issues");
        }
      }
    }
  }, [messages]);

  // Update read status of messages when user changes
  useEffect(() => {
    if (user) {
      const updatedMessages = messages.map(msg => 
        msg.sender !== user && msg.readStatus === 'sent' 
          ? { ...msg, readStatus: 'seen' as ReadStatus } 
          : msg
      );
      
      if (JSON.stringify(updatedMessages) !== JSON.stringify(messages)) {
        setMessages(updatedMessages);
      }
    }
  }, [messages, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for typing from other user (simulated)
  useEffect(() => {
    // In a real app, this would use WebSockets or another real-time solution
    const checkOtherUserTyping = setInterval(() => {
      // Simulated - in reality, we'd get this from a server
      const otherUserTyping = localStorage.getItem('otherUserTyping') === 'true';
      setIsTyping(otherUserTyping);
    }, 1000);
    
    return () => clearInterval(checkOtherUserTyping);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser);
    localStorage.setItem('chatUser', selectedUser || '');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chatUser');
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Simulate notifying the other user that we're typing
    localStorage.setItem('otherUserTyping', 'true');
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a new timeout
    typingTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem('otherUserTyping', 'false');
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if ((newMessage.trim() || selectedFile) && user) {
      const newMessageObj: Message = {
        id: uuidv4(),
        text: newMessage,
        sender: user,
        timestamp: new Date(),
        readStatus: 'sent',
        replyTo: replyTo || undefined,
        media: mediaPreview || undefined
      };
      
      setMessages([...messages, newMessageObj]);
      setNewMessage('');
      setReplyTo(null);
      setMediaPreview(null);
      setSelectedFile(null);
      localStorage.setItem('otherUserTyping', 'false');
    }
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyTo(messageId);
    inputRef.current?.focus();
  };

  const getReplyMessage = (id: string) => {
    return messages.find(m => m.id === id);
  };

  const handleDeleteChat = () => {
    if (window.confirm("Are you sure you want to delete all messages? This cannot be undone.")) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  if (!user) {
    return (
      <div className="login-container">
        <h1>Choose Your User</h1>
        <div className="login-buttons">
          <button className="user-r-btn" onClick={() => handleLogin('R')}>User R</button>
          <button className="user-b-btn" onClick={() => handleLogin('B')}>User B</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat as {user}</h2>
        <div className="chat-actions">
          <button className="delete-btn" onClick={handleDeleteChat}>
            Delete Chat
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === user ? 'sent' : 'received'}`}
            onDoubleClick={() => handleReplyToMessage(message.id)}
          >
            {message.replyTo && (
              <div className="reply-preview">
                <p>{getReplyMessage(message.replyTo)?.text.substring(0, 50)}</p>
              </div>
            )}
            
            {message.media && (
              <div className="media-container">
                <img src={message.media} alt="Shared media" />
              </div>
            )}
            
            <p>{message.text}</p>
            
            <div className="message-info">
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.sender === user && (
                <span className={`read-status ${message.readStatus}`}>
                  {message.readStatus === 'sent' ? '✓' : '✓✓'}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="typing-indicator">
            <span>{user === 'R' ? 'B' : 'R'} is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        {replyTo && (
          <div className="reply-container">
            <p>Replying to: {getReplyMessage(replyTo)?.text.substring(0, 30)}...</p>
            <button onClick={() => setReplyTo(null)}>Cancel</button>
          </div>
        )}
        
        {mediaPreview && (
          <div className="media-preview">
            <img src={mediaPreview} alt="Preview" />
            <button onClick={() => {
              setMediaPreview(null);
              setSelectedFile(null);
            }}>Cancel</button>
          </div>
        )}
        
        <div className="message-input">
          <button 
            className="emoji-btn" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          
          <label className="file-input-label">
            📎
            <input 
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
          
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
          />
          
          <button 
            className="send-btn" 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !selectedFile}
          >
            Send
          </button>
        </div>
        
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker onEmojiClick={addEmoji} />
          </div>
        )}
      </div>
    </div>
  );
}
