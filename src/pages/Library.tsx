import { useNavigate } from 'react-router-dom';
import '../css/Library.css';
import bibleImage from '../assets/bible.jpg';
import quranImage from '../assets/quran.jpg';
import hadithImage from '../assets/hadith.jpg';

const Library = () => {
  const navigate = useNavigate();

  const sources = [
    {
      id: 'quran',
      name: 'Quran',
      description: 'The Holy Quran - Complete Arabic text with translations',
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
      description: 'The Holy Bible - Old and New Testament',
      image: bibleImage,
      route: '/bible'
    }
  ];

  const handleSourceClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="library-container">
      <h1 className="page-title">Library</h1>
      <p className="page-subtitle">Browse through our religious texts and sources</p>
      
      <div className="sources-grid">
        {sources.map((source) => (
          <div 
            key={source.id}
            className="source-card"
            onClick={() => handleSourceClick(source.route)}
          >
            <div className="source-image-container">
              <img 
                src={source.image} 
                alt={source.name}
                className="source-image"
              />
            </div>
            <div className="source-content">
              <h3 className="source-title">{source.name}</h3>
              <p className="source-description">{source.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library; 