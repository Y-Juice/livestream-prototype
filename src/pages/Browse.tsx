import YouTubeVideos from './YouTubeVideos';
import '../css/Browse.css';

const Browse = () => {
  // Empty activeStreams array since we don't need to show live streams on browse page
  const activeStreams: any[] = [];

  return (
    <div className="browse-container">
      <h1 className="page-title">Browse</h1>
      <p className="page-subtitle">Discover content by category</p>
      
      {/* All category carousels */}
      <div className="browse-content">
        <YouTubeVideos activeStreams={activeStreams} showOnlyNewest={false} showNewestContent={false} />
      </div>
    </div>
  );
};

export default Browse; 