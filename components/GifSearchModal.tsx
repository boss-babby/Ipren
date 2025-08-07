import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, SearchIcon, LoadingSpinner } from './icons';
import { 
    searchGiphyGifs,
    getTrendingGiphyGifs,
    searchTenorGifs,
    getTrendingTenorGifs,
    isGiphyConfigured,
    isTenorConfigured,
    GifSearchResult,
    PaginatedGifResults
} from '../services/aiArchitectService';

interface GifSearchModalProps {
    onClose: () => void;
    onSelectGif: (src: string) => void;
}

type SearchProvider = 'giphy' | 'tenor';

const GifSearchModal: React.FC<GifSearchModalProps> = ({ onClose, onSelectGif }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GifSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isGiphyAvailable, setIsGiphyAvailable] = useState(false);
    const [isTenorAvailable, setIsTenorAvailable] = useState(false);
    const [provider, setProvider] = useState<SearchProvider | null>(null);
    
    const [next, setNext] = useState<string | undefined>(undefined);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ 
        x: window.innerWidth / 2 - 350, 
        y: 150 
    });

    useEffect(() => {
        const giphy = isGiphyConfigured();
        const tenor = isTenorConfigured();
        setIsGiphyAvailable(giphy);
        setIsTenorAvailable(tenor);

        if (giphy) setProvider('giphy');
        else if (tenor) setProvider('tenor');
        else setProvider(null);
    }, []);

    const fetchTrending = async () => {
        if (!provider) return;
        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const { results: trendingResults, next: nextPos } = provider === 'giphy' 
                ? await getTrendingGiphyGifs() 
                : await getTrendingTenorGifs();
            setResults(trendingResults);
            setNext(nextPos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not fetch trending GIFs.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (provider) {
            setQuery(''); // Clear query when provider changes
            fetchTrending();
        } else {
            setError("Please set an API key for Giphy or Tenor in the File > Set API Key menu.");
            setResults([]);
        }
    }, [provider]);

    
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            fetchTrending();
            return;
        }
        if (!provider) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const { results: searchResults, next: nextPos } = provider === 'giphy' 
                ? await searchGiphyGifs(trimmedQuery) 
                : await searchTenorGifs(trimmedQuery);
            
            setResults(searchResults);
            setNext(nextPos);
            if(searchResults.length === 0) {
                setError('No results found for that query.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMore = async () => {
        if (isFetchingMore || !next || !provider) return;

        setIsFetchingMore(true);
        setError(null);
        try {
            let paginatedResult: PaginatedGifResults;
            const trimmedQuery = query.trim();

            if (trimmedQuery) { // Searching
                paginatedResult = provider === 'giphy'
                    ? await searchGiphyGifs(trimmedQuery, parseInt(next))
                    : await searchTenorGifs(trimmedQuery, next);
            } else { // Trending
                paginatedResult = provider === 'giphy'
                    ? await getTrendingGiphyGifs(parseInt(next))
                    : await getTrendingTenorGifs(next);
            }

            setResults(prev => [...prev, ...paginatedResult.results]);
            setNext(paginatedResult.next);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while fetching more GIFs.');
        } finally {
            setIsFetchingMore(false);
        }
    };
    
    useEffect(() => {
        const handleScroll = () => {
            const container = scrollContainerRef.current;
            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                if (scrollTop + clientHeight >= scrollHeight - 300) {
                    fetchMore();
                }
            }
        };

        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [next, isFetchingMore, provider, query]);
    
    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            setPosition({
                x: moveEvent.clientX - startX,
                y: moveEvent.clientY - startY,
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={panelRef}
            className="fixed w-[700px] h-[550px] bg-gray-50 rounded-lg shadow-2xl border border-gray-300 flex flex-col"
            style={{ 
                top: `${position.y}px`, 
                left: `${position.x}px`,
                zIndex: 1000,
            }}
        >
             <div 
                className="flex items-center justify-between p-3 bg-slate-700 text-white rounded-t-lg cursor-move"
                onMouseDown={handleDragStart}
            >
                <h3 className="text-md font-semibold flex items-center">
                    <SearchIcon />
                    <span className="ml-2">Search for GIFs</span>
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
                <div className="flex border-b mb-3">
                    <button 
                        onClick={() => setProvider('giphy')} 
                        disabled={!isGiphyAvailable}
                        className={`px-4 py-2 text-sm font-medium ${provider === 'giphy' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'} disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                        Giphy
                        {!isGiphyAvailable && <span className="text-xs text-red-500 ml-1">(API key needed)</span>}
                    </button>
                    <button 
                        onClick={() => setProvider('tenor')} 
                        disabled={!isTenorAvailable}
                        className={`px-4 py-2 text-sm font-medium ${provider === 'tenor' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'} disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                        Tenor
                        {!isTenorAvailable && <span className="text-xs text-red-500 ml-1">(API key needed)</span>}
                    </button>
                </div>
                <form onSubmit={handleSearch} className="flex items-center space-x-2">
                     <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={provider ? `Search ${provider.charAt(0).toUpperCase() + provider.slice(1)}` : 'Set an API key to search'}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white text-gray-900"
                        disabled={isLoading || !provider}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim() || !provider}
                        className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Search'}
                    </button>
                </form>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                        <span className="ml-2 text-gray-600">Loading...</span>
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-600 p-4">{error}</div>
                )}
                {!isLoading && !error && (
                    <div className="columns-3 gap-4">
                        {results.map((result, index) => (
                            <button
                                key={`${result.id}-${index}`}
                                onClick={() => onSelectGif(result.url)}
                                className="w-full h-auto mb-4 bg-gray-200 rounded-md overflow-hidden group relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 block"
                            >
                                <img src={result.previewUrl} alt={result.alt} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                    <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add to Slide</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {isFetchingMore && (
                    <div className="flex justify-center items-center py-4">
                        <LoadingSpinner />
                        <span className="ml-2 text-gray-600">Loading more...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GifSearchModal;
