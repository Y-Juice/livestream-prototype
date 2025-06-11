import { useState, useEffect } from 'react';
import '../css/SourceReader.css';

interface SourceReaderProps {
  source: 'bible' | 'quran' | 'hadith';
  sourceName: string;
  sourceDescription: string;
}

interface Chapter {
  _id: string;
  number: number;
  name: string;
  verses?: number;
  hadiths?: number;
  abbrev?: string; // For Bible books
}

interface Content {
  _id: string;
  chapter?: number;
  book?: string;
  collection?: number;
  collection_name?: string;
  verse?: number;
  verse_number?: number;
  hadith_number?: number;
  text: string;
  translation?: string;
  arabic?: string;
  bookId?: number;
}

// Bible-specific interfaces
interface BibleBook {
  _id: string;
  name: string;
  abbrev: string;
  chapters: string[][];
}

interface BibleChapter {
  chapterNumber: number;
  verses: string[];
}

const SourceReader = ({ source, sourceName, sourceDescription }: SourceReaderProps) => {
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Bible-specific state
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookChapters, setBookChapters] = useState<BibleChapter[]>([]);
  const [selectedBookChapter, setSelectedBookChapter] = useState<number | null>(null);

  // Fetch chapters/books structure
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/${source}`);
        if (response.ok) {
          const data = await response.json();
          
          if (source === 'bible') {
            // Bible returns books overview
            const chaptersData = data.map((book: BibleBook, index: number) => ({
              _id: book._id,
              number: index + 1,
              name: book.name,
              abbrev: book.abbrev,
              verses: book.chapters.reduce((total, chapter) => total + chapter.length, 0),
              hadiths: 0
            }));
            setChapters(chaptersData);
          } else if (source === 'hadith') {
            // Hadith returns collections overview
            const chaptersData = data.map((collection: any) => ({
              _id: collection._id,
              number: collection.number || collection.id,
              name: collection.name,
              verses: 0,
              hadiths: collection.hadiths || collection.length || 0
            }));
            setChapters(chaptersData);
          } else {
            // Quran - data is already formatted as chapters list from server
            setChapters(data);
          }
        }
      } catch (err) {
        setError(`Error loading ${sourceName} structure`);
        console.error('Error fetching chapters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [source, sourceName]);

  // Fetch content for selected chapter (Bible-specific handling)
  const fetchChapterContent = async (chapterNumber: number) => {
    try {
      setLoading(true);
      
      if (source === 'bible') {
        // For Bible, we need to get the book first, then show its chapters
        const book = chapters.find(c => c.number === chapterNumber);
        if (book) {
          setSelectedBook(book.abbrev || book.name);
          const response = await fetch(`/api/${source}?book=${book.abbrev || book.name}`);
          if (response.ok) {
            const bookData: BibleBook = await response.json();
            const chaptersData = bookData.chapters.map((chapter, index) => ({
              chapterNumber: index + 1,
              verses: chapter
            }));
            setBookChapters(chaptersData);
            setSelectedBookChapter(null); // Reset chapter selection
            setContent([]); // Clear content until specific chapter is selected
          }
        }
        setSelectedChapter(chapterNumber);
      } else {
        // For Quran and Hadith, use existing logic
        let response;
        if (source === 'hadith') {
          response = await fetch(`/api/${source}?collection=${chapterNumber}`);
        } else {
          response = await fetch(`/api/${source}?chapter=${chapterNumber}`);
        }
        
        if (response.ok) {
          const data = await response.json();
          setContent(data.sort((a: any, b: any) => {
            const aNum = a.verse || a.hadith_number || a.verse_number || 0;
            const bNum = b.verse || b.hadith_number || b.verse_number || 0;
            return aNum - bNum;
          }));
          setSelectedChapter(chapterNumber);
        }
      }
    } catch (err) {
      setError(`Error loading chapter content`);
      console.error('Error fetching chapter content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Bible-specific: Fetch content for selected book chapter
  const fetchBibleChapterContent = async (chapterNumber: number) => {
    const selectedChapterData = bookChapters.find(ch => ch.chapterNumber === chapterNumber);
    if (selectedChapterData) {
      const contentData = selectedChapterData.verses.map((verse, index) => ({
        _id: `${selectedBook}-${chapterNumber}-${index + 1}`,
        text: verse,
        verse: index + 1,
        chapter: chapterNumber,
        book: selectedBook || ''
      }));
      setContent(contentData);
      setSelectedBookChapter(chapterNumber);
    }
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/${source}?search=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (err) {
      setError('Error searching content');
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChapterLabel = () => {
    switch (source) {
      case 'quran': return 'Surah';
      case 'bible': return 'Book';
      case 'hadith': return 'Collection';
      default: return 'Chapter';
    }
  };

  const getVerseLabel = () => {
    switch (source) {
      case 'quran': return 'Ayah';
      case 'bible': return 'Verse';
      case 'hadith': return 'Hadith';
      default: return 'Verse';
    }
  };

  return (
    <div className="source-reader-container">
      {/* Header */}
      <div className="source-header">
        <h1 className="source-title">{sourceName}</h1>
        <p className="source-subtitle">{sourceDescription}</p>
        
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'browse' ? 'active' : ''}`}
            onClick={() => setMode('browse')}
          >
            📖 Browse
          </button>
          <button 
            className={`mode-btn ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
          >
            🔍 Search
          </button>
        </div>
      </div>

      {/* Search Mode */}
      {mode === 'search' && (
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder={`Search ${sourceName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button onClick={handleSearch} className="search-btn">
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results ({searchResults.length})</h3>
              <div className="results-list">
                {searchResults.map((result) => (
                  <div key={result._id} className="result-item">
                    <div className="result-reference">
                      {getChapterLabel()} {result.chapter || result.book || result.collection_name || result.collection}
                      {(result.verse || result.verse_number) && `, ${getVerseLabel()} ${result.verse || result.verse_number}`}
                      {result.hadith_number && `, ${getVerseLabel()} ${result.hadith_number}`}
                    </div>
                    {result.arabic && (
                      <div className="result-arabic" style={{fontFamily: 'Arial', fontSize: '1.2rem', textAlign: 'right', marginBottom: '0.5rem', color: '#f0f0f0'}}>{result.arabic}</div>
                    )}
                    <div className="result-text">{result.text}</div>
                    {result.translation && (
                      <div className="result-translation">{result.translation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Browse Mode */}
      {mode === 'browse' && (
        <div className="browse-section">
          <div className={`browse-layout ${source === 'bible' ? 'bible-layout' : ''}`}>
            {/* Chapters List */}
            <div className="chapters-sidebar">
              <h3>{getChapterLabel()}s</h3>
              <div className="chapters-list">
                {chapters.map((chapter) => (
                  <div
                    key={chapter._id}
                    className={`chapter-item ${selectedChapter === chapter.number ? 'active' : ''}`}
                    onClick={() => fetchChapterContent(chapter.number)}
                  >
                    <div className="chapter-number">{chapter.number}</div>
                    <div className="chapter-info">
                      <div className="chapter-name">{chapter.name}</div>
                      <div className="chapter-meta">
                        {source === 'bible' && `${bookChapters.length || 0} chapters, ${chapter.verses} verses`}
                        {source === 'quran' && chapter.verses && `${chapter.verses} verses`}
                        {source === 'hadith' && chapter.hadiths && `${chapter.hadiths} hadiths`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bible Chapters List (when book is selected) */}
            {source === 'bible' && selectedBook && bookChapters.length > 0 && (
              <div className="bible-chapters-sidebar">
                <h3>Chapters</h3>
                <div className="chapters-list">
                  {bookChapters.map((chapter) => (
                    <div
                      key={chapter.chapterNumber}
                      className={`chapter-item ${selectedBookChapter === chapter.chapterNumber ? 'active' : ''}`}
                      onClick={() => fetchBibleChapterContent(chapter.chapterNumber)}
                    >
                      <div className="chapter-number">{chapter.chapterNumber}</div>
                      <div className="chapter-info">
                        <div className="chapter-name">Chapter {chapter.chapterNumber}</div>
                        <div className="chapter-meta">{chapter.verses.length} verses</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Display */}
            <div className="content-display">
              {source === 'bible' && selectedBook && !selectedBookChapter ? (
                <div className="content-placeholder">
                  <h3>Select a chapter to begin reading</h3>
                  <p>Choose from the chapters list to start reading {chapters.find(c => c.number === selectedChapter)?.name}</p>
                </div>
              ) : selectedChapter && content.length > 0 ? (
                <div className="chapter-content">
                  <h2>
                    {source === 'bible' && selectedBook 
                      ? `${chapters.find(c => c.number === selectedChapter)?.name} ${selectedBookChapter}`
                      : `${getChapterLabel()} ${selectedChapter}: ${chapters.find(c => c.number === selectedChapter)?.name}`
                    }
                  </h2>
                  <div className="verses-list">
                    {content.map((item) => (
                      <div key={item._id} className="verse-item">
                        <div className="verse-number">
                          {item.verse || item.verse_number || item.hadith_number}
                        </div>
                        <div className="verse-content">
                          {item.arabic && (
                            <div className="verse-arabic" style={{fontFamily: 'Arial', fontSize: '1.3rem', textAlign: 'right', marginBottom: '0.75rem', color: '#f0f0f0', lineHeight: '1.8'}}>{item.arabic}</div>
                          )}
                          <div className="verse-text">{item.text}</div>
                          {item.translation && (
                            <div className="verse-translation">{item.translation}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="content-placeholder">
                  <h3>Select a {getChapterLabel().toLowerCase()} to begin reading</h3>
                  <p>Choose from the list on the left to start reading {sourceName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="loading-state">
          <p>Loading...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default SourceReader; 