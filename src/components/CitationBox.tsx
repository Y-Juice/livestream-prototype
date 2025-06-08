import React, { useState, useEffect } from 'react';
import quranData from '../data/en_quran.json';
import bibleData from '../data/en_bible.json';
import bukhariData from '../data/bukhari.json';
import muslimData from '../data/muslim.json';
import abudawudData from '../data/abudawud.json';
import tirmidhiData from '../data/tirmidhi.json';
import nasaiData from '../data/nasai.json';
import ibnmajahData from '../data/ibnmajah.json';
import malikData from '../data/malik.json';
import darimiData from '../data/darimi.json';

// Levenshtein distance function for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
};

// Function to calculate similarity ratio
const calculateSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
};

// Function to find best match using fuzzy search
const findBestMatch = (searchText: string, texts: string[], threshold: number = 0.7): string | null => {
  let bestMatch = null;
  let bestSimilarity = threshold;

  for (const text of texts) {
    const similarity = calculateSimilarity(searchText, text);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = text;
    }
  }

  return bestMatch;
};

interface Citation {
  source: 'quran' | 'bible' | 'hadith';
  text: string;
  timestamp: Date;
  reference?: {
    surah?: string;
    verse?: string;
    chapter?: string;
    verseNumber?: string;
    hadithNumber?: string;
    book?: string;
    collection?: string;
  };
}

// Add type definitions for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const CitationBox: React.FC = () => {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Function to detect citation patterns
  const detectCitationPattern = (text: string) => {
    const patterns = {
      quran: [
        /quran\s+(\d+):(\d+)/i,
        /surah\s+(\d+)\s+verse\s+(\d+)/i,
        /surah\s+(\d+)\s+ayah\s+(\d+)/i,
        /(\d+):(\d+)/i  // Simple chapter:verse pattern
      ],
      bible: [
        /bible\s+(\w+)\s+(\d+):(\d+)/i,
        /(\w+)\s+(\d+):(\d+)/i,  // Book chapter:verse pattern
        /chapter\s+(\d+)\s+verse\s+(\d+)/i
      ],
      hadith: [
        /hadith\s+(\d+)/i,
        /bukhari\s+(\d+)/i,
        /muslim\s+(\d+)/i,
        /abudawud\s+(\d+)/i,
        /tirmidhi\s+(\d+)/i
      ]
    };

    // Check Quran patterns
    for (const pattern of patterns.quran) {
      const match = text.match(pattern);
      if (match) {
        const [_, chapter, verse] = match;
        return {
          type: 'quran',
          chapter: parseInt(chapter),
          verse: parseInt(verse)
        };
      }
    }

    // Check Bible patterns
    for (const pattern of patterns.bible) {
      const match = text.match(pattern);
      if (match) {
        const [_, book, chapter, verse] = match;
        return {
          type: 'bible',
          book: book?.toLowerCase(),
          chapter: parseInt(chapter),
          verse: parseInt(verse)
        };
      }
    }

    // Check Hadith patterns
    for (const pattern of patterns.hadith) {
      const match = text.match(pattern);
      if (match) {
        const [_, number] = match;
        return {
          type: 'hadith',
          number: parseInt(number)
        };
      }
    }

    return null;
  };

  // Function to search Quran by reference
  const searchQuranByReference = (chapter: number, verse: number) => {
    const chapterStr = chapter.toString();
    if (quranData[chapterStr] && Array.isArray(quranData[chapterStr])) {
      const verseData = quranData[chapterStr].find((v: any) => v.verse === verse);
      if (verseData) {
        return {
          surah: `Surah ${chapterStr}`,
          verse: verse.toString(),
          text: verseData.text
        };
      }
    }
    return null;
  };

  // Function to search Bible with fuzzy matching
  const searchBible = (text: string) => {
    const searchText = text.toLowerCase();
    let bestMatch = null;
    let bestSimilarity = 0.7;
    let bestReference = null;

    try {
      // Search through all books and chapters
      for (const book of bibleData) {
        // Skip if book structure is invalid
        if (!book || typeof book !== 'object') continue;
        if (!book.chapters || !Array.isArray(book.chapters)) continue;
        
        for (const chapter of book.chapters) {
          // Skip if chapter structure is invalid
          if (!chapter || typeof chapter !== 'object') continue;
          if (!chapter.verses || !Array.isArray(chapter.verses)) continue;
          
          for (const verse of chapter.verses) {
            // Skip if verse structure is invalid
            if (!verse || typeof verse !== 'object') continue;
            if (!verse.text || typeof verse.text !== 'string') continue;
            
            const similarity = calculateSimilarity(searchText, verse.text);
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMatch = verse.text;
              bestReference = {
                chapter: `${book.name} ${chapter.chapter}`,
                verseNumber: verse.verse.toString()
              };
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching Bible:', error);
    }

    return bestReference;
  };

  // Function to search Bible by reference
  const searchBibleByReference = (book: string, chapter: number, verse: number) => {
    try {
      const bookData = bibleData.find((b: any) => 
        b && b.name && b.name.toLowerCase().includes(book.toLowerCase())
      );
      
      if (!bookData || !bookData.chapters || !Array.isArray(bookData.chapters)) {
        return null;
      }
      
      const chapterData = bookData.chapters.find((c: any) => 
        c && c.chapter === chapter
      );
      
      if (!chapterData || !chapterData.verses || !Array.isArray(chapterData.verses)) {
        return null;
      }
      
      const verseData = chapterData.verses.find((v: any) => 
        v && v.verse === verse
      );
      
      if (!verseData || !verseData.text) {
        return null;
      }
      
      return {
        chapter: `${bookData.name} ${chapter}`,
        verseNumber: verse.toString(),
        text: verseData.text
      };
    } catch (error) {
      console.error('Error searching Bible by reference:', error);
      return null;
    }
  };

  // Function to search Hadith by number
  const searchHadithByNumber = (number: number) => {
    const collections = [
      { name: 'Bukhari', data: bukhariData },
      { name: 'Muslim', data: muslimData },
      { name: 'Abu Dawud', data: abudawudData },
      { name: 'Tirmidhi', data: tirmidhiData }
    ];

    for (const collection of collections) {
      if (Array.isArray(collection.data)) {
        const hadith = collection.data.find((h: any) => 
          h.hadithNumber === number.toString()
        );
        
        if (hadith) {
          return {
            hadithNumber: hadith.hadithNumber,
            book: hadith.bookName,
            collection: collection.name,
            text: hadith.text
          };
        }
      }
    }
    return null;
  };

  // Function to search Quran with fuzzy matching
  const searchQuran = (text: string) => {
    const searchText = text.toLowerCase();
    let bestMatch = null;
    let bestSimilarity = 0.7;
    let bestReference = null;

    // Search through all chapters
    for (const [chapter, verses] of Object.entries(quranData)) {
      if (!Array.isArray(verses)) continue;
      
      for (const verse of verses) {
        if (!verse.text) continue;
        
        const similarity = calculateSimilarity(searchText, verse.text);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = verse.text;
          bestReference = {
            surah: `Surah ${chapter}`,
            verse: verse.verse.toString()
          };
        }
      }
    }

    return bestReference;
  };

  // Function to search Hadith collections with fuzzy matching
  const searchHadith = (text: string) => {
    const searchText = text.toLowerCase();
    let bestMatch = null;
    let bestSimilarity = 0.7;
    let bestReference = null;

    const hadithCollections = [
      { name: 'Bukhari', data: bukhariData },
      { name: 'Muslim', data: muslimData },
      { name: 'Abu Dawud', data: abudawudData },
      { name: 'Tirmidhi', data: tirmidhiData },
      { name: 'Nasai', data: nasaiData },
      { name: 'Ibn Majah', data: ibnmajahData },
      { name: 'Malik', data: malikData },
      { name: 'Darimi', data: darimiData }
    ];

    // Search through each collection
    for (const collection of hadithCollections) {
      if (!Array.isArray(collection.data)) continue;
      
      for (const hadith of collection.data) {
        if (!hadith.text) continue;
        
        const similarity = calculateSimilarity(searchText, hadith.text);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = hadith.text;
          bestReference = {
            hadithNumber: hadith.hadithNumber,
            book: hadith.bookName,
            collection: collection.name
          };
        }
      }
    }

    return bestReference;
  };

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        try {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');

          // Check for citations
          if (event.results[0].isFinal) {
            console.log('Processing transcript:', transcript);
            
            // First check for citation patterns
            const citation = detectCitationPattern(transcript);
            if (citation) {
              console.log('Detected citation pattern:', citation);
              
              if (citation.type === 'quran') {
                const reference = searchQuranByReference(citation.chapter, citation.verse);
                if (reference) {
                  console.log('Found Quran reference:', reference);
                  addCitation('quran', reference.text, reference);
                }
              } else if (citation.type === 'bible') {
                const reference = searchBibleByReference(citation.book, citation.chapter, citation.verse);
                if (reference) {
                  console.log('Found Bible reference:', reference);
                  addCitation('bible', reference.text, reference);
                }
              } else if (citation.type === 'hadith') {
                const reference = searchHadithByNumber(citation.number);
                if (reference) {
                  console.log('Found Hadith reference:', reference);
                  addCitation('hadith', reference.text, reference);
                }
              }
            } else {
              // If no citation pattern found, try searching by content
              console.log('Searching by content...');
              
              // Try Quran first
              const quranReference = searchQuran(transcript);
              if (quranReference) {
                console.log('Found Quran reference by content:', quranReference);
                addCitation('quran', transcript, quranReference);
                return;
              }
              
              // Try Bible next
              const bibleReference = searchBible(transcript);
              if (bibleReference) {
                console.log('Found Bible reference by content:', bibleReference);
                addCitation('bible', transcript, bibleReference);
                return;
              }
              
              // Try Hadith last
              const hadithReference = searchHadith(transcript);
              if (hadithReference) {
                console.log('Found Hadith reference by content:', hadithReference);
                addCitation('hadith', transcript, hadithReference);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error processing speech recognition result:', error);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start();
        }
      };

      setRecognition(recognition);
    } else {
      console.error('Speech recognition not supported');
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const addCitation = (source: 'quran' | 'bible' | 'hadith', text: string, reference?: any) => {
    setCitations(prev => [...prev, {
      source,
      text,
      timestamp: new Date(),
      reference
    }]);
  };

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        console.log('Speech recognition started');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
    setIsListening(!isListening);
  };

  const renderReference = (citation: Citation) => {
    if (!citation.reference) return null;

    if (citation.source === 'quran' && citation.reference.surah) {
      return (
        <div className="reference">
          <span className="reference-label">Surah:</span> {citation.reference.surah}
          {citation.reference.verse && (
            <>
              <span className="reference-label">Verse:</span> {citation.reference.verse}
            </>
          )}
        </div>
      );
    }

    if (citation.source === 'bible' && citation.reference.chapter) {
      return (
        <div className="reference">
          <span className="reference-label">Chapter:</span> {citation.reference.chapter}
          {citation.reference.verseNumber && (
            <>
              <span className="reference-label">Verse:</span> {citation.reference.verseNumber}
            </>
          )}
        </div>
      );
    }

    if (citation.source === 'hadith' && citation.reference.hadithNumber) {
      return (
        <div className="reference">
          <span className="reference-label">Hadith #{citation.reference.hadithNumber}</span>
          {citation.reference.book && (
            <span className="reference-label">Book: {citation.reference.book}</span>
          )}
          {citation.reference.collection && (
            <span className="reference-label">Collection: {citation.reference.collection}</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="citation-box">
      <div className="citation-header">
        <h3>Religious Citations</h3>
        <button 
          onClick={toggleListening}
          className={`listen-button ${isListening ? 'listening' : ''}`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      <div className="citations-list">
        {citations.map((citation, index) => (
          <div key={index} className="citation-item">
            <span className={`source ${citation.source}`}>{citation.source}</span>
            <p>{citation.text}</p>
            {renderReference(citation)}
            <small>{citation.timestamp.toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
      <style>{`
        .citation-box {
          background: #fff;
          border-radius: 8px;
          padding: 15px;
          margin: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 400px;
          overflow-y: auto;
        }
        .citation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .listen-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #4CAF50;
          color: white;
          cursor: pointer;
          transition: background 0.3s;
        }
        .listen-button.listening {
          background: #f44336;
        }
        .citation-item {
          border-left: 4px solid #4CAF50;
          padding: 10px;
          margin: 10px 0;
          background:rgb(50, 50, 50);
        }
        .source {
          font-weight: bold;
          text-transform: capitalize;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .source.quran { background: #e3f2fd; color: #1976d2; }
        .source.bible { background: #e8f5e9; color: #2e7d32; }
        .source.hadith { background: #fff3e0; color: #f57c00; }
        .citations-list {
          max-height: 300px;
          overflow-y: auto;
        }
        .reference {
          margin-top: 8px;
          font-size: 0.9em;
          color: #666;
        }
        .reference-label {
          font-weight: bold;
          margin-right: 4px;
        }
      `}</style>
    </div>
  );
};

export default CitationBox; 