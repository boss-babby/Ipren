import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, SearchIcon, LoadingSpinner } from './icons';
import { 
    searchUnsplashImages, 
    searchWikimediaImages, 
    searchPexelsImages,
    searchPixabayImages,
    isUnsplashConfigured, 
    isPexelsConfigured,
    isPixabayConfigured,
    ImageSearchResult 
} from '../services/aiArchitectService';

interface ImageSearchModalProps {
    onClose: () => void;
    onSelectImage: (src: string) => void;
}

type SearchProvider = 'unsplash' | 'wikimedia' | 'pexels' | 'pixabay';
type SearchResult = ImageSearchResult;

const ImageSearchModal: React.FC<ImageSearchModalProps> = ({ onClose, onSelectImage }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<SearchProvider>('unsplash');
    const [isUnsplashAvailable, setIsUnsplashAvailable] = useState(false);
    const [isPexelsAvailable, setIsPexelsAvailable] = useState(false);
    const [isPixabayAvailable, setIsPixabayAvailable] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ 
        x: window.innerWidth / 2 - 300, 
        y: 150 
    });

    useEffect(() => {
        const unsplash = isUnsplashConfigured();
        const pexels = isPexelsConfigured();
        const pixabay = isPixabayConfigured();

        setIsUnsplashAvailable(unsplash);
        setIsPexelsAvailable(pexels);
        setIsPixabayAvailable(pixabay);

        if (unsplash) {
            setProvider('unsplash');
        } else if (pexels) {
            setProvider('pexels');
        } else if (pixabay) {
            setProvider('pixabay');
        } else {
            setProvider('wikimedia');
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            let searchResults: SearchResult[];
            switch(provider) {
                case 'unsplash':
                    searchResults = await searchUnsplashImages(query);
                    break;
                case 'pexels':
                    searchResults = await searchPexelsImages(query);
                    break;
                case 'pixabay':
                    searchResults = await searchPixabayImages(query);
                    break;
                case 'wikimedia':
                    searchResults = await searchWikimediaImages(query);
                    break;
                default:
                    searchResults = [];
            }
            
            setResults(searchResults);
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
            className="fixed w-[600px] h-[550px] bg-gray-50 rounded-lg shadow-2xl border border-gray-300 flex flex-col"
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
                    <span className="ml-2">Search for Images</span>
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
                <div className="flex border-b mb-3">
                    <button 
                        onClick={() => setProvider('unsplash')} 
                        disabled={!isUnsplashAvailable}
                        className={`px-4 py-2 text-sm font-medium ${provider === 'unsplash' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'} disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                        Unsplash
                        {!isUnsplashAvailable && <span className="text-xs text-red-500 ml-1">(API key needed)</span>}
                    </button>
                    <button 
                        onClick={() => setProvider('pexels')} 
                        disabled={!isPexelsAvailable}
                        className={`px-4 py-2 text-sm font-medium ${provider === 'pexels' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'} disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                        Pexels
                        {!isPexelsAvailable && <span className="text-xs text-red-500 ml-1">(API key needed)</span>}
                    </button>
                     <button 
                        onClick={() => setProvider('pixabay')} 
                        disabled={!isPixabayAvailable}
                        className={`px-4 py-2 text-sm font-medium ${provider === 'pixabay' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'} disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                        Pixabay
                        {!isPixabayAvailable && <span className="text-xs text-red-500 ml-1">(API key needed)</span>}
                    </button>
                    <button 
                        onClick={() => setProvider('wikimedia')} 
                        className={`px-4 py-2 text-sm font-medium ${provider === 'wikimedia' ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Wikimedia
                    </button>
                </div>
                <form onSubmit={handleSearch} className="flex items-center space-x-2">
                     <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`e.g., modern architecture on ${provider}`}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white text-gray-900"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Search'}
                    </button>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                        <span className="ml-2 text-gray-600">Searching...</span>
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-600 p-4">{error}</div>
                )}
                {!isLoading && !error && (
                    <div className="grid grid-cols-3 gap-4">
                        {results.map(result => (
                            <button
                                key={result.id}
                                onClick={() => onSelectImage(result.urls.regular)}
                                className="aspect-video bg-gray-200 rounded-md overflow-hidden group relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <img src={result.urls.thumb} alt={result.alt_description} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                    <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add to Slide</span>
                                </div>
                                {provider === 'wikimedia' && typeof result.size === 'number' && (
                                    <div
                                        className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={`Original file size: ${(result.size / 1024 / 1024).toFixed(2)} MB. A smaller version will be used if the original is too large.`}
                                    >
                                        <span>{(result.size / 1024 / 1024).toFixed(2)} MB</span>
                                        {result.urls.regular.includes('/thumb/') && <span className="text-yellow-300 ml-1">(resized)</span>}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageSearchModal;