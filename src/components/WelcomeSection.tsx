import { Link } from 'react-router-dom';
import '../css/WelcomeSection.css';
import welcomeImage from '../assets/welcome.jpg';

const WelcomeSection = () => {
  return (
    <section className="welcome-section">
      <div className="welcome-content">
        <div className="welcome-image">
          <img src={welcomeImage} alt="Dalil Talk Discussion" />
        </div>
        <div className="welcome-text">
          <h1 className="welcome-title">Welcome to Dalil Talk</h1>
          <p className="welcome-description">
            Join enlightening discussions where Islamic perspectives 
            meet other faiths through respectful dialogue and verified 
            sources.
          </p>
          <Link to="/browse" className="browse-btn">
            <span className="browse-icon">▶</span>
            Browse
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WelcomeSection; 