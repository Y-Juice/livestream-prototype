import { useState } from 'react';

interface SearchResult {
  text: string;
  reference: string;
  source: string;
}

interface ReligiousCitationSearchProps {
  onSelectCitation: (citation: SearchResult) => void;
  onClose: () => void;
}

const ReligiousCitationSearch = ({ onSelectCitation, onClose }: ReligiousCitationSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSource, setSearchSource] = useState<'quran' | 'bible' | 'hadith'>('quran');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchQuran = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use our proxy API endpoint
      const response = await fetch(`/api/search/quran?query=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.matches) {
        const formattedResults: SearchResult[] = data.data.matches.map((match: any) => ({
          text: match.text,
          reference: `Surah ${match.surah.englishName} (${match.surah.number}:${match.numberInSurah})`,
          source: 'Quran'
        })).slice(0, 5); // Limit to 5 results
        
        setResults(formattedResults);
      } else {
        setResults([]);
        if (data.data && data.data.matches && data.data.matches.length === 0) {
          setError('No results found');
        } else {
          setError('Error searching the Quran');
        }
      }
    } catch (err) {
      console.error('Error searching Quran:', err);
      setError('Failed to search the Quran');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchHadith = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use our proxy API endpoint
      const response = await fetch(`/api/search/hadith?query=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.matches) {
        const formattedResults: SearchResult[] = data.data.matches.map((match: any) => ({
          text: match.text,
          reference: match.reference || "Reference not available",
          source: 'Hadith'
        })).slice(0, 5); // Limit to 5 results
        
        setResults(formattedResults);
      } else {
        setResults([]);
        setError('Hadith search is not fully implemented in this version');
      }
    } catch (err) {
      console.error('Error searching Hadith:', err);
      setError('Failed to search Hadith');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchBible = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use our proxy API endpoint
      const response = await fetch(`/api/search/bible?query=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.matches) {
        const formattedResults: SearchResult[] = data.data.matches.map((match: any) => ({
          text: match.text,
          reference: match.reference || "Reference not available",
          source: 'Bible'
        })).slice(0, 5); // Limit to 5 results
        
        setResults(formattedResults);
      } else {
        setResults([]);
        setError('Bible search is not fully implemented in this version');
      }
    } catch (err) {
      console.error('Error searching Bible:', err);
      setError('Failed to search the Bible');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    switch (searchSource) {
      case 'quran':
        await searchQuran();
        break;
      case 'hadith':
        await searchHadith();
        break;
      case 'bible':
        await searchBible();
        break;
    }
  };

  const handleSelectCitation = (citation: SearchResult) => {
    onSelectCitation(citation);
    onClose();
  };

  return (
    <div className="absolute bottom-16 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Search Religious Citations</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-3">
        <div className="flex gap-2 mb-2">
          <select 
            value={searchSource}
            onChange={(e) => setSearchSource(e.target.value as 'quran' | 'bible' | 'hadith')}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="quran">Quran</option>
            <option value="bible">Bible</option>
            <option value="hadith">Hadith</option>
          </select>
          
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter search term..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 mb-3 rounded">
          {error}
        </div>
      )}
      
      <div className="max-h-60 overflow-y-auto">
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectCitation(result)}
              >
                <div className="text-sm font-semibold text-blue-600">{result.reference}</div>
                <div className="text-sm mt-1">{result.text}</div>
                <div className="text-xs text-gray-500 mt-1">Source: {result.source}</div>
              </div>
            ))}
          </div>
        ) : !isLoading && !error ? (
          <p className="text-gray-500 text-center">Search for citations to see results</p>
        ) : null}
      </div>
    </div>
  );
};

export default ReligiousCitationSearch; 