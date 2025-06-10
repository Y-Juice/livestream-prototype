import { useEffect } from 'react'
import YouTubeVideos from '../pages/YouTubeVideos'
import CategoriesCarousel from '../components/CategoriesCarousel'
import WelcomeSection from '../components/WelcomeSection'
import SourcesCarousel from '../components/SourcesCarousel'
import '../css/Home.css'

interface Stream {
  streamId: string
  broadcaster: string
  viewerCount: number
}

interface HomeProps {
  activeStreams: Stream[]
}

const Home = ({ activeStreams }: HomeProps) => {
  // Log when active streams change
  useEffect(() => {
    console.log('Home component received activeStreams:', activeStreams)
  }, [activeStreams])

  return (
    <div className="home-container">
      {/* Content with top margin to account for fixed header */}
      <div className="main-content">
        {/* Welcome Section */}
        <WelcomeSection />

        {/* Sacred Sources Carousel */}
        <div className="sources-section">
          <SourcesCarousel />
        </div>

        {/* Featured Streams - Only Newest Content */}
        <div className="featured-section">
          <YouTubeVideos activeStreams={activeStreams} showOnlyNewest={true} />
        </div>

        {/* Categories Carousel */}
          <div className="categories-section">
          <CategoriesCarousel />
          </div>
      </div>
    </div>
  )
}

export default Home 