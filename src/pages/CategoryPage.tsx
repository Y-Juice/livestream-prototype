import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import '../css/CategoryPage.css';

interface Video {
  _id: string;
  category: string;
  channel_name: string;
  title: string;
  url: string;
}

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategoryVideos = async () => {
      if (!category) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/videos?category=${encodeURIComponent(category)}`);
        if (!response.ok) throw new Error('Failed to fetch videos');
        const data = await response.json();
        setVideos(data);
      } catch (err) {
        setError('Error loading category videos');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryVideos();
  }, [category]);

  const getVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="category-page-container">
        <div className="category-header">
          <Link to="/" className="back-btn">← Back to Home</Link>
        </div>
        <p className="loading-text">Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-page-container">
        <div className="category-header">
          <Link to="/" className="back-btn">← Back to Home</Link>
        </div>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="category-page-container">
      <div className="category-header">
        <Link to="/" className="back-btn">← Back to Home</Link>
        <h1 className="category-title">{category}</h1>
        <p className="category-subtitle">{videos.length} videos</p>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p>No videos found in this category.</p>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => {
            const videoId = getVideoId(video.url);
            const thumbnailUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
              : '';
            
            return (
              <div
                key={video._id}
                className="video-card"
                onClick={() => navigate(`/video/${video._id}`)}
              >
                <div className="video-thumbnail-wrapper">
                  <img
                    src={thumbnailUrl}
                    alt={video.title}
                    className="video-thumbnail"
                  />
                </div>
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-channel">{video.channel_name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryPage; 