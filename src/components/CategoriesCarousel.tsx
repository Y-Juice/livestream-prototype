import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/CategoriesCarousel.css';

interface Category {
  name: string;
  icon: string;
  count?: number;
}

const CategoriesCarousel = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/videos/categories');
        if (response.ok) {
          const data = await response.json();
          const categoriesWithIcons = data.map((categoryName: string) => ({
            name: categoryName,
            icon: getCategoryIcon(categoryName),
            count: Math.floor(Math.random() * 50) + 5 // Mock count for now
          }));
          setCategories(categoriesWithIcons);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
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

    const cardWidth = 256 + 16; // card width + gap
    const scrollAmount = cardWidth * 3;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    if (direction === 'left') {
      if (carousel.scrollLeft <= 0) {
        carousel.scrollLeft = maxScroll;
      } else {
        carousel.scrollLeft -= scrollAmount;
      }
    } else {
      if (carousel.scrollLeft >= maxScroll) {
        carousel.scrollLeft = 0;
      } else {
        carousel.scrollLeft += scrollAmount;
      }
    }
  };

  const renderCategoryCard = (category: Category) => {
    return (
      <div
        key={category.name}
        className="cat-card"
        onClick={() => navigate(`/category/${encodeURIComponent(category.name)}`)}
      >
        <div className="cat-icon-wrapper">
          <span className="cat-icon">{category.icon}</span>
        </div>
        <div className="cat-overlay">
          <h3 className="cat-card-title">{category.name}</h3>
          <div className="cat-info-row">
            <span className="cat-count">Browse content</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="cat-container">
        <h3 className="cat-section-title">Browse by Category</h3>
        <p>Loading categories...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  // Duplicate categories for infinite scroll effect
  const duplicatedCategories = [...categories, ...categories, ...categories];

  return (
    <div className="cat-container">
      <div className="cat-section">
        <h3 className="cat-section-title">Browse by Category</h3>
        <div className="cat-carousel-wrapper">
          <button 
            className="cat-nav-button left"
            onClick={() => scroll('left')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <div 
            className="cat-carousel"
            ref={carouselRef}
            onMouseDown={handleDragStart}
          >
            {duplicatedCategories.map((category, index) => (
              <div key={`${category.name}-${index}`}>
                {renderCategoryCard(category)}
              </div>
            ))}
          </div>
          <button 
            className="cat-nav-button right"
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

export default CategoriesCarousel; 