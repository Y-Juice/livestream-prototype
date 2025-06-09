import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
        const response = await fetch(`/api/videos/${id}`);
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
      <Link to="/" className="wv-back">&larr; Back to Home</Link>
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
      <div className="wv-info">
        <h2 className="wv-title">{video.title}</h2>
        <p className="wv-channel">{video.channel_name}</p>
        <p className="wv-category">Category: {video.category}</p>
      </div>
    </div>
  );
};

export default WatchVideo; 