import { Link, useLocation } from 'react-router-dom';
import '../css/Sidebar.css';

interface SidebarProps {
  username: string;
}

const Sidebar = ({ username }: SidebarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const recommendedChannels = [
    { name: 'FalyedFit', avatar: '👤' },
    { name: 'The Deen Show', avatar: '👤' }
  ];

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🎯</span>
          <h2>Dalil Talk</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </Link>

        <Link 
          to="/browse" 
          className={`nav-item ${isActive('/browse') ? 'active' : ''}`}
        >
          <span className="nav-icon">🔍</span>
          <span>Browse</span>
        </Link>

        <Link 
          to="/following" 
          className={`nav-item ${isActive('/following') ? 'active' : ''}`}
        >
          <span className="nav-icon">❤️</span>
          <span>Following</span>
        </Link>

        <Link 
          to="/library" 
          className={`nav-item ${isActive('/library') ? 'active' : ''}`}
        >
          <span className="nav-icon">📚</span>
          <span>Library</span>
        </Link>
      </nav>

      {/* Recommended Channels */}
      <div className="recommended-section">
        <h3 className="section-title">RECOMMENDED CHANNELS</h3>
        <div className="recommended-channels">
          {recommendedChannels.map((channel, index) => (
            <div key={index} className="channel-item">
              <span className="channel-avatar">{channel.avatar}</span>
              <span className="channel-name">{channel.name}</span>
              <span className="channel-status">●</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div className="sidebar-footer">
        <Link to="/profile" className="profile-section">
          <span className="profile-avatar">👤</span>
          <div className="profile-info">
            <span className="profile-name">{username}</span>
            <span className="profile-action">View Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar; 