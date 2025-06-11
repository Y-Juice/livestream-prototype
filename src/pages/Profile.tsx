import '../css/Profile.css';

interface ProfileProps {
  username: string;
}

const Profile = ({ username }: ProfileProps) => {
  return (
    <div className="profile-container">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Welcome, {username}</p>
      
      <div className="placeholder-content">
        <p>Profile page coming soon...</p>
        <p>This will allow you to personalize your profile</p>
      </div>
    </div>
  );
};

export default Profile; 