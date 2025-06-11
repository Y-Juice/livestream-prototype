import { Link, useLocation } from 'react-router-dom';
import '../css/Sidebar.css';
import dalilTalkLogo from '../assets/dalilTalkLogo.png';
import homeIcon from '../assets/home.png';
import browseIcon from '../assets/browse.png';
import libraryIcon from '../assets/library.png';

interface SidebarProps {
  username: string;
}

const Sidebar = ({ username }: SidebarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <img src={dalilTalkLogo} alt="Dalil Talk" className="logo-image" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <img src={homeIcon} alt="Home" className="nav-icon-img" />
          <span>Home</span>
        </Link>

        <Link 
          to="/browse" 
          className={`nav-item ${isActive('/browse') ? 'active' : ''}`}
        >
          <img src={browseIcon} alt="Browse" className="nav-icon-img" />
          <span>Browse</span>
        </Link>


        <Link 
          to="/library" 
          className={`nav-item ${isActive('/library') ? 'active' : ''}`}
        >
          <img src={libraryIcon} alt="Library" className="nav-icon-img" />
          <span>Library</span>
        </Link>
      </nav>

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