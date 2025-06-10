import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/SourcesCarousel.css';
import bibleImage from '../assets/bible.jpg';
import quranImage from '../assets/quran.jpg';
import hadithImage from '../assets/hadith.jpg';

interface Source {
  id: string;
  name: string;
  description: string;
  image: string;
  route: string;
}

const SourcesCarousel = () => {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const sources: Source[] = [
    {
      id: 'quran',
      name: 'Quran',
      description: 'The holy book of Islam, revealed to Prophet Muhammad (PBUH)',
      image: quranImage,
      route: '/quran'
    },
    {
      id: 'hadith',
      name: 'Hadith',
      description: 'Sayings and traditions of Prophet Muhammad (PBUH)',
      image: hadithImage,
      route: '/hadith'
    },
    {
      id: 'bible',
      name: 'Bible',
      description: 'The sacred text of Christianity',
      image: bibleImage,
      route: '/bible'
    }
  ];

  const handleDragStart = (e: React.MouseEvent) => {
    const carousel = carouselRef.current;
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
      
      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const scroll = (direction: 'left' | 'right') => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const cardWidth = 320 + 24; // card width + gap
    const scrollAmount = cardWidth;

    if (direction === 'left') {
      carousel.scrollLeft -= scrollAmount;
    } else {
      carousel.scrollLeft += scrollAmount;
    }
  };

  const renderSourceCard = (source: Source) => {
    return (
      <div
        key={source.id}
        className="source-card"
        onClick={() => navigate(source.route)}
      >
        <div className="source-image">
          <img src={source.image} alt={source.name} />
          <div className="source-overlay">
            <div className="source-content">
              <h3 className="source-title">{source.name}</h3>
              <p className="source-description">{source.description}</p>
              <div className="source-action">
                <span className="read-btn">Read & Search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sources-container">
      <div className="sources-section">
        <h3 className="sources-section-title">Sacred Sources</h3>
        <div className="sources-carousel-wrapper">
          <button 
            className="sources-nav-button left"
            onClick={() => scroll('left')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <div 
            className="sources-carousel"
            ref={carouselRef}
            onMouseDown={handleDragStart}
          >
            {sources.map((source) => renderSourceCard(source))}
          </div>
          <button 
            className="sources-nav-button right"
            onClick={() => scroll('right')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourcesCarousel; 