import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ViewStream from '../components/ViewStream';
import Chat from '../components/Chat';
import { Socket } from 'socket.io-client';
import { apiCall } from '../config/api';
import '../css/WatchStream.css';

interface WatchStreamProps {
  username: string;
  socket: Socket;
}

interface SourceContent {
  _id: string;
  text: string;
  book?: string;
  chapter?: number;
  verse?: number;
  collection_name?: string;
  hadith_number?: number;
}

interface JoinRequest {
  username: string;
  timestamp: number;
}

const WatchStream = ({ username, socket }: WatchStreamProps) => {
  const { streamId } = useParams<{ streamId: string }>();
  const [showSources] = useState(false);
  const [sourceResults, setSourceResults] = useState<{
    quran: SourceContent[];
    bible: SourceContent[];
    hadith: SourceContent[];
  }>({
    quran: [],
    bible: [],
    hadith: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isStreamer, setIsStreamer] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  // Check if current user is the streamer
  useEffect(() => {
    if (socket && streamId) {
      socket.emit('check-streamer', { streamId, username });
      
      socket.on('streamer-status', ({ isStreamer: streamerStatus }) => {
        setIsStreamer(streamerStatus);
      });

      socket.on('join-request', (request: JoinRequest) => {
        setJoinRequests(prev => [...prev, request]);
      });

      socket.on('join-accepted', () => {
        setHasJoined(true);
        setHasRequestedJoin(false);
      });

      socket.on('join-rejected', () => {
        setHasRequestedJoin(false);
      });

      socket.on('kicked-from-co-streaming', () => {
        setHasJoined(false);
        setHasRequestedJoin(false);
        // Show notification that user was kicked
        alert('You have been removed from co-streaming by the broadcaster.');
      });

      socket.on('co-streamer-left', ({ username: leftUsername }) => {
        console.log(`Co-streamer ${leftUsername} left`);
        // This will be handled by ViewStream component
      });

      return () => {
        socket.off('streamer-status');
        socket.off('join-request');
        socket.off('join-accepted');
        socket.off('join-rejected');
        socket.off('kicked-from-co-streaming');
        socket.off('co-streamer-left');
      };
    }
  }, [socket, streamId, username]);



  const searchSources = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Search all three sources
      const [quranRes, bibleRes, hadithRes] = await Promise.all([
        apiCall(`/api/quran?search=${encodeURIComponent(searchQuery)}`),
        apiCall(`/api/bible?search=${encodeURIComponent(searchQuery)}`),
        apiCall(`/api/hadith?search=${encodeURIComponent(searchQuery)}`)
      ]);

      const [quranData, bibleData, hadithData] = await Promise.all([
        quranRes.ok ? quranRes.json() : [],
        bibleRes.ok ? bibleRes.json() : [],
        hadithRes.ok ? hadithRes.json() : []
      ]);

      setSourceResults({
        quran: quranData.slice(0, 3), // Limit to 3 results each
        bible: bibleData.slice(0, 3),
        hadith: hadithData.slice(0, 3)
      });
    } catch (error) {
      console.error('Error searching sources:', error);
    }
  };

  const handleRequestJoin = () => {
    if (socket && streamId && !hasRequestedJoin) {
      socket.emit('request-join', { streamId, username });
      setHasRequestedJoin(true);
    }
  };

  const handleJoinRequest = (requestUsername: string, accept: boolean) => {
    if (socket && streamId) {
      socket.emit('respond-join-request', { 
        streamId, 
        requestUsername, 
        accept 
      });
      
      setJoinRequests(prev => 
        prev.filter(req => req.username !== requestUsername)
      );
    }
  };

  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
    // TODO: Implement actual camera toggle via WebRTC
  };

  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    // TODO: Implement actual mic toggle via WebRTC
  };

  const handleLeaveCoStreaming = () => {
    if (socket && streamId) {
      socket.emit('leave-co-streaming', { streamId });
      setHasJoined(false);
      setHasRequestedJoin(false);
    }
  };

  return (
    <div className="ws-container">
      <div className="ws-new-layout">
        {/* Stream Video - Full Width */}
        <div className="ws-video-container">
          <ViewStream 
            username={username} 
            socket={socket}
            hasJoined={hasJoined}
            cameraEnabled={cameraEnabled}
            micEnabled={micEnabled}
            onCameraToggle={toggleCamera}
            onMicToggle={toggleMic}
          />
        </div>

        {/* Content Row - Info and Chat Side by Side */}
        <div className="ws-content-row">
          {/* Main Content Area */}
          <div className="ws-main-content">
            {/* Stream Info and Description */}
            <div className="ws-info-section">
              {/* Stream Info */}
              <div className="ws-stream-info">
                <h2 className="ws-stream-title">Feminism & Red Pill VS Islam</h2>
                <div className="ws-stream-metadata">
                  <span className="ws-viewers">👥 12K watching</span>
                  <span className="ws-started">🟢 Started 2 hours ago</span>
                </div>
                <div className="ws-streamer-info">
                  <span className="ws-streamer">FaiyalFit</span>
                  <span className="ws-followers">145 followers</span>
                  <button className="ws-follow-btn">Follow</button>
                </div>
              </div>

              {/* Description */}
              <div className="ws-description">
                <h3>Description</h3>
                <p>Join me in this thought-provoking livestream debate as we explore the intersections and contrasts between feminism, red pill ideologies, and Islamic teachings. Our range of experts and scholars will discuss key topics such as gender roles, equality, relationships, and societal values. Dive into a respectful exchange of ideas, uncovering diverse perspectives on these critical issues, and engage with live Q&A to share your thoughts.</p>
              </div>

              {/* Sources Section */}
              {showSources && (
                <div className="ws-sourced">
                  <h3>Sourced</h3>
                  <div className="ws-source-items">
                    <div className="ws-source-item">
                      <strong>61:7:04</strong> Qur'an: Surah An-Nisa (4:34)
                      <p>• Addresses the roles and responsibilities of men and women in family structures.</p>
                      <p>• Translation: "Men are the protectors and maintainers of women..."</p>
                    </div>
                    <div className="ws-source-item">
                      <strong>62:35:09</strong> Hadith: Narrated by Abu Hurairah (Sahih Bukhari)
                      <p>• The Prophet Muhammad (PBUH) said: "The best of you are those who are best to their women."</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="ws-chat-sidebar">
            <Chat 
              username={username}
              streamId={streamId || ''}
              socket={socket}
              hasJoined={hasJoined}
              hasRequestedJoin={hasRequestedJoin}
              onRequestJoin={handleRequestJoin}
              cameraEnabled={cameraEnabled}
              micEnabled={micEnabled}
              onCameraToggle={toggleCamera}
              onMicToggle={toggleMic}
              onLeaveCoStreaming={handleLeaveCoStreaming}
            />
          </div>
        </div>
      </div>

      {/* Sources Panel */}
      {showSources && (
        <div className="ws-sources-panel">
          <h3>Search Sacred Sources</h3>
          <div className="ws-search-bar">
            <input
              type="text"
              placeholder="Search Quran, Bible, Hadith..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchSources()}
              className="ws-search-input"
            />
            <button onClick={searchSources} className="ws-search-btn">
              Search
            </button>
          </div>

          {(sourceResults.quran.length > 0 || sourceResults.bible.length > 0 || sourceResults.hadith.length > 0) && (
            <div className="ws-sources-content">
              {sourceResults.quran.length > 0 && (
                <div className="ws-source-section">
                  <h4>📖 Quran</h4>
                  {sourceResults.quran.map((result) => (
                    <div key={result._id} className="ws-source-result">
                      <div className="ws-source-ref">
                        Chapter {result.chapter}, Verse {result.verse}
                      </div>
                      <p>{result.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {sourceResults.bible.length > 0 && (
                <div className="ws-source-section">
                  <h4>✝️ Bible</h4>
                  {sourceResults.bible.map((result) => (
                    <div key={result._id} className="ws-source-result">
                      <div className="ws-source-ref">
                        {result.book} {result.chapter}:{result.verse}
                      </div>
                      <p>{result.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {sourceResults.hadith.length > 0 && (
                <div className="ws-source-section">
                  <h4>📚 Hadith</h4>
                  {sourceResults.hadith.map((result) => (
                    <div key={result._id} className="ws-source-result">
                      <div className="ws-source-ref">
                        {result.collection_name} - Hadith {result.hadith_number}
                      </div>
                      <p>{result.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Join Request Popups for Streamer */}
      {isStreamer && joinRequests.map((request) => (
        <div key={request.username} className="ws-join-request-popup">
          <div className="ws-popup-content">
            <h4>Join Request</h4>
            <p><strong>{request.username}</strong> wants to join your stream</p>
            <div className="ws-popup-actions">
              <button 
                className="ws-accept-btn"
                onClick={() => handleJoinRequest(request.username, true)}
              >
                Accept
              </button>
              <button 
                className="ws-reject-btn"
                onClick={() => handleJoinRequest(request.username, false)}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WatchStream; 