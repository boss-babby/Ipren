import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, SearchIcon, LoadingSpinner } from './icons';
import { searchIconifyIcons, IconifyInfo } from '../services/aiArchitectService';

interface IconSearchModalProps {
    onClose: () => void;
    onSelectIcon: (svgString: string) => void;
}

const IconSearchModal: React.FC<IconSearchModalProps> = ({ onClose, onSelectIcon }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IconifyInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ 
        x: window.innerWidth / 2 - 350, 
        y: 150 
    });

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const searchResults = await searchIconifyIcons(query);
            setResults(searchResults);
            if (searchResults.length === 0) {
                setError('No results found for that query.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSelect = async (icon: IconifyInfo) => {
        try {
            // Fetch the raw SVG string
            const response = await fetch(`https://api.iconify.design/${icon.prefix}/${icon.name}.svg`);
            if (!response.ok) throw new Error('Failed to fetch SVG');
            const svgString = await response.text();
            onSelectIcon(svgString);
        } catch (err) {
            setError("Could not retrieve the selected icon's data.");
        }
    }

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
                    <span className="ml-2">Search for Icons</span>
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
                <form onSubmit={handleSearch} className="flex items-center space-x-2">
                     <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., business chart, user profile, arrow right"
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
                    <div className="grid grid-cols-8 gap-2">
                        {results.map(icon => (
                            <button
                                key={`${icon.prefix}:${icon.name}`}
                                onClick={() => handleSelect(icon)}
                                className="aspect-square bg-white text-gray-700 border border-gray-200 rounded-md p-2 flex items-center justify-center group relative hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                title={`${icon.prefix}:${icon.name}`}
                            >
                                <img 
                                    src={`https://api.iconify.design/${icon.prefix}/${icon.name}.svg?color=currentColor`}
                                    alt={icon.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IconSearchModal;
