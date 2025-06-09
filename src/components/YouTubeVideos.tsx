import { useState, useEffect } from 'react';
import './YouTubeVideos.css';

interface Video {
  _id: string;
  category: string;
  channel_name: string;
  title: string;
  url: string;
}

const YouTubeVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/videos/categories', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const url = selectedCategory 
          ? `/api/videos?category=${encodeURIComponent(selectedCategory)}`
          : '/api/videos';
          
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }

        const data = await response.json();
        setVideos(data);
      } catch (err) {
        setError('Error loading videos');
        console.error('Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [selectedCategory]);

  const getVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-600">Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="ytv-container">
      <h2 className="ytv-title">YouTube Videos</h2>
      {/* Category Filter */}
      <div className="ytv-category-filter">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="ytv-select"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      {videos.length === 0 ? (
        <p className="ytv-empty">No videos available.</p>
      ) : (
        <div className="ytv-carousel">
          {videos.map((video) => {
            const videoId = getVideoId(video.url);
            const thumbnailUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
              : '';
            return (
              <div
                key={video._id}
                className="ytv-card"
              >
                <img
                  src={thumbnailUrl}
                  alt={video.title}
                  className="ytv-thumbnail"
                />
                {/* Overlay for info */}
                <div className="ytv-overlay">
                  <h3 className="ytv-card-title">{video.title}</h3>
                  <div className="ytv-channel-row">
                    <span className="ytv-channel">{video.channel_name}</span>
                  </div>
                  <div className="ytv-category-row">
                    <span>{video.category}</span>
                  </div>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ytv-link"
                    aria-label="Watch on YouTube"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default YouTubeVideos; 