import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import YouTubeVideos from '../pages/YouTubeVideos'
import '../css/Home.css'

interface Stream {
  streamId: string
  broadcaster: string
  viewerCount: number
}

interface HomeProps {
  isLoggedIn: boolean
  onLogout: () => void
  activeStreams: Stream[]
}

const Home = ({ isLoggedIn, onLogout, activeStreams }: HomeProps) => {
  const [categories, setCategories] = useState<string[]>([]);
  
  // Log when active streams change
  useEffect(() => {
    console.log('Home component received activeStreams:', activeStreams)
  }, [activeStreams])

  // Fetch categories for the category section
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/videos/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Education': '📚',
      'Islamic Studies': '🕌',
      'Science': '🔬',
      'History': '📜',
      'Philosophy': '🤔',
      'Religion': '☪️',
      'Technology': '💻',
      'Health': '🏥',
      'Art': '🎨',
      'Music': '🎵'
    };
    return icons[category] || '📺';
  };

  return (
    <div className="home-container">
      {/* Fixed Header with Action Buttons */}
      <div className="fixed-header">
        {isLoggedIn ? (
          <div className="logged-in-actions">
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
            <Link to="/create" className="go-live-btn">
              🔴 Go Live
            </Link>
          </div>
        ) : (
          <div className="logged-out-actions">
            <Link to="/login" className="login-btn">
              Login
            </Link>
          </div>
        )}
      </div>

      {/* Content with top margin to account for fixed header */}
      <div className="main-content">
        {/* Featured Streams */}
        <div className="featured-section">
          <YouTubeVideos activeStreams={activeStreams} />
        </div>

        {/* Popular Categories */}
        {categories.length > 0 && (
          <div className="categories-section">
            <h2 className="section-title">Popular Categories</h2>
            <div className="categories-grid">
              {categories.map((category) => (
                <Link
                  key={category}
                  to={`/category/${encodeURIComponent(category)}`}
                  className="category-card"
                >
                  <div className="category-icon">
                    {getCategoryIcon(category)}
                  </div>
                  <div className="category-info">
                    <h3 className="category-name">{category}</h3>
                    <p className="category-subtitle">Browse content</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home 