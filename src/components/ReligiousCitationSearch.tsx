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
      
      // Use our own API endpoint
      const response = await fetch(`/api/quran?search=${encodeURIComponent(searchTerm)}&limit=5`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const formattedResults: SearchResult[] = data.map((verse: any) => ({
          text: verse.text || verse.translation || verse.english || '',
          reference: `Surah ${verse.chapter || verse.surah_number || 'N/A'}, Ayah ${verse.verse || verse.verse_number || verse.ayah_number || 'N/A'}`,
          source: 'Quran'
        }));
        
        setResults(formattedResults);
      } else {
        setResults([]);
        setError('No results found in the Quran');
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
      
      // Use our own API endpoint
      const response = await fetch(`/api/hadith?search=${encodeURIComponent(searchTerm)}&limit=5`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const formattedResults: SearchResult[] = data.map((hadith: any) => ({
          text: hadith.text || hadith.english || hadith.translation || '',
          reference: `${hadith.collection_name || hadith.collection || 'Hadith'} - ${hadith.hadith_number || hadith.number || 'N/A'}`,
          source: 'Hadith'
        }));
        
        setResults(formattedResults);
      } else {
        setResults([]);
        setError('No results found in Hadith collections');
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
      
      // Use our own API endpoint
      const response = await fetch(`/api/bible?search=${encodeURIComponent(searchTerm)}&limit=5`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const formattedResults: SearchResult[] = data.map((verse: any) => ({
          text: verse.text || verse.verse_text || '',
          reference: `${verse.book || 'Bible'} ${verse.chapter || 'N/A'}:${verse.verse || verse.verse_number || 'N/A'}`,
          source: 'Bible'
        }));
        
        setResults(formattedResults);
      } else {
        setResults([]);
        setError('No results found in the Bible');
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

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectCitation = (citation: SearchResult) => {
    onSelectCitation(citation);
    onClose();
  };

  return (
    <div className="absolute bottom-16 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-6 z-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Search Religious Citations</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors"
        >
          ×
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex gap-3 mb-3">
          <select 
            value={searchSource}
            onChange={(e) => setSearchSource(e.target.value as 'quran' | 'bible' | 'hadith')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700"
          >
            <option value="quran">📖 Quran</option>
            <option value="bible">✝️ Bible</option>
            <option value="hadith">📚 Hadith</option>
          </select>
          
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter search term..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}
      
      <div className="max-h-80 overflow-y-auto">
        {results.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Search Results ({results.length})</h4>
            {results.map((result, index) => (
              <div 
                key={index} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all duration-200 group"
                onClick={() => handleSelectCitation(result)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                    {result.reference}
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {result.source}
                  </div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                  {result.text}
                </div>
                <div className="text-xs text-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to add to message
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && !error ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📖</div>
            <p className="text-gray-500">Search for citations to see results</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ReligiousCitationSearch; 