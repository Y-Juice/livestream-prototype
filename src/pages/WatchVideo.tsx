import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiCall } from '../config/api';
import '../css/WatchVideo.css';

interface Video {
  _id: string;
  category: string;
  channel_name: string;
  title: string;
  url: string;
}

const WatchVideo = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await apiCall(`/api/videos/${id}`);
        if (!response.ok) throw new Error('Failed to fetch video');
        const data = await response.json();
        setVideo(data);
      } catch (err) {
        setError('Error loading video');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  const getVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  if (loading) return <div className="wv-container"><p>Loading...</p></div>;
  if (error) return <div className="wv-container"><p>{error}</p></div>;
  if (!video) return null;

  const videoId = getVideoId(video.url);

  return (
    <div className="wv-container">
      <div className="wv-layout">
        {/* Video Section */}
        <div className="wv-video-section">
          <div className="wv-player-wrapper">
            {videoId ? (
              <iframe
                className="wv-player"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Invalid YouTube URL</p>
            )}
          </div>
          
          {/* Video Info */}
          <div className="wv-info">
            <h1 className="wv-title">{video.title}</h1>
            <div className="wv-metadata">
              <span className="wv-channel">{video.channel_name}</span>
              <span className="wv-category">• {video.category}</span>
            </div>
            <div className="wv-description">
              <p>Video description would go here. This is a placeholder for the video description content.</p>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="wv-sidebar">
          <div className="wv-comments-section">
            <h3 className="wv-comments-title">Comments</h3>
            <div className="wv-comments-placeholder">
              <p>Comments will be displayed here for YouTube videos.</p>
              <p>This is a placeholder comment section.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchVideo; 