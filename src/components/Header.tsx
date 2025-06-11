import { Link } from 'react-router-dom';
import '../css/Header.css';

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header = ({ isLoggedIn, onLogout }: HeaderProps) => {
  return (
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
  );
};

export default Header; 