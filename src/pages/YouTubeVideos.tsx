import { useState, useEffect, useRef } from 'react';
import '../css/YouTubeVideos.css';
import { useNavigate } from 'react-router-dom';

interface Video {
  _id: string;
  category: string;
  channel_name: string;
  title: string;
  url: string;
}

interface Stream {
  streamId: string;
  broadcaster: string;
  viewerCount: number;
}

interface YouTubeVideosProps {
  activeStreams: Stream[];
}

const YouTubeVideos = ({ activeStreams }: YouTubeVideosProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/videos', {
          credentials: 'include',
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
  }, []);

  const getVideoId = (url: string) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  // Group videos by category
  const videosByCategory = videos.reduce((acc, video) => {
    if (!acc[video.category]) {
      acc[video.category] = [];
    }
    acc[video.category].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  const handleDragStart = (carouselId: string, e: React.MouseEvent) => {
    const carousel = carouselRefs.current[carouselId];
    if (!carousel) return;

    const startX = e.pageX;
    const scrollLeft = carousel.scrollLeft;
    let isDragging = false;

    const handleMouseMove = (e: MouseEvent) => {
      isDragging = true;
      const x = e.pageX - startX;
      carousel.scrollLeft = scrollLeft - x;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Prevent click events if we were dragging
      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const scroll = (carouselId: string, direction: 'left' | 'right') => {
    const carousel = carouselRefs.current[carouselId];
    if (!carousel) return;

    const cardWidth = 256 + 16; // card width + gap
    const scrollAmount = cardWidth * 3; // scroll 3 cards at a time
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    if (direction === 'left') {
      if (carousel.scrollLeft <= 0) {
        // At beginning, jump to end for infinite scroll
        carousel.scrollLeft = maxScroll;
      } else {
        carousel.scrollLeft -= scrollAmount;
      }
    } else {
      if (carousel.scrollLeft >= maxScroll) {
        // At end, jump to beginning for infinite scroll
        carousel.scrollLeft = 0;
      } else {
        carousel.scrollLeft += scrollAmount;
      }
    }
  };

  const renderVideoCard = (video: Video) => {
    const videoId = getVideoId(video.url);
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : '';
    
    return (
      <div
        key={video._id}
        className="ytv-card"
        onClick={() => navigate(`/video/${video._id}`)}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="ytv-thumbnail"
        />
        <div className="ytv-overlay">
          <h3 className="ytv-card-title">{video.title}</h3>
          <div className="ytv-channel-row">
            <span className="ytv-channel">{video.channel_name}</span>
          </div>
          <div className="ytv-category-row">
            <span>{video.category}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStreamCard = (stream: Stream) => {
    return (
      <div
        key={`stream-${stream.streamId}`}
        className="ytv-card ytv-stream-card"
        onClick={() => navigate(`/view/${stream.streamId}`)}
        style={{ cursor: 'pointer' }}
      >
        <div className="ytv-stream-thumbnail">
          <div className="ytv-stream-icon">
            <svg width="48" height="48" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div className="ytv-live-badge">LIVE</div>
        </div>
        <div className="ytv-overlay">
          <h3 className="ytv-card-title">{stream.broadcaster}'s Stream</h3>
          <div className="ytv-channel-row">
            <span className="ytv-channel">Live Stream</span>
          </div>
          <div className="ytv-category-row">
            <span>{stream.viewerCount} {stream.viewerCount === 1 ? 'viewer' : 'viewers'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCarousel = (title: string, items: (Video | Stream)[], isMainCarousel = false) => {
    if (items.length === 0 && (!isMainCarousel || activeStreams.length === 0)) return null;

    const carouselId = title.replace(/\s+/g, '-').toLowerCase();
    
    // Create items array for main carousel (streams + videos) or category carousel (just videos)
    const allItems = isMainCarousel 
      ? [...activeStreams, ...items.filter(item => 'url' in item)] 
      : items.filter(item => 'url' in item);

    // Duplicate items for infinite scroll effect
    const duplicatedItems = [...allItems, ...allItems, ...allItems];

    return (
      <div className="ytv-section" key={title}>
        <h3 className="ytv-section-title">{title}</h3>
        <div className="ytv-carousel-wrapper">
          <button 
            className="ytv-nav-button left"
            onClick={() => scroll(carouselId, 'left')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <div 
            className="ytv-carousel"
            ref={el => { carouselRefs.current[carouselId] = el; }}
            onMouseDown={(e) => handleDragStart(carouselId, e)}
            style={{ 
              scrollBehavior: 'smooth',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {duplicatedItems.map((item, index) => {
              if ('streamId' in item) {
                return (
                  <div key={`${item.streamId}-${index}`}>
                    {renderStreamCard(item)}
                  </div>
                );
              } else {
                return (
                  <div key={`${item._id}-${index}`}>
                    {renderVideoCard(item)}
                  </div>
                );
              }
            })}
          </div>
          <button 
            className="ytv-nav-button right"
            onClick={() => scroll(carouselId, 'right')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ytv-container">
        <p>Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ytv-container">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="ytv-container">
      
      {/* Main carousel with all videos + streams */}
      {renderCarousel('Newest Content', videos, true)}
      
      {/* Category carousels */}
      {Object.entries(videosByCategory).map(([category, categoryVideos]) =>
        renderCarousel(category, categoryVideos)
      )}
    </div>
  );
};

export default YouTubeVideos; 