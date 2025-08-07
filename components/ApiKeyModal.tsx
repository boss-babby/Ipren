import React, { useState } from 'react';
import { CloseIcon, KeyIcon } from './icons';

interface ApiKeyModalProps {
    onClose: () => void;
    onSave: (keys: { unsplash: string; pexels: string; pixabay: string; giphy: string; tenor: string; }) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave }) => {
    const [unsplashKey, setUnsplashKey] = useState(localStorage.getItem('unsplashApiKey') || '');
    const [pexelsKey, setPexelsKey] = useState(localStorage.getItem('pexelsApiKey') || '');
    const [pixabayKey, setPixabayKey] = useState(localStorage.getItem('pixabayApiKey') || '');
    const [giphyKey, setGiphyKey] = useState(localStorage.getItem('giphyApiKey') || '');
    const [tenorKey, setTenorKey] = useState(localStorage.getItem('tenorApiKey') || '');
    
    const handleSave = () => {
        onSave({
            unsplash: unsplashKey,
            pexels: pexelsKey,
            pixabay: pixabayKey,
            giphy: giphyKey,
            tenor: tenorKey,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center space-x-2">
                        <KeyIcon />
                        <span>Set API Keys</span>
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <CloseIcon />
                    </button>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="unsplash-key" className="block text-sm font-medium text-gray-700">Unsplash API Key</label>
                        <p className="text-xs text-gray-500 mb-2">
                            Required for the AI to search for and add real images to slides.
                        </p>
                        <input
                            type="text"
                            id="unsplash-key"
                            value={unsplashKey}
                            onChange={(e) => setUnsplashKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Unsplash Access Key"
                        />
                    </div>
                     <div>
                        <label htmlFor="pexels-key" className="block text-sm font-medium text-gray-700">Pexels API Key</label>
                        <p className="text-xs text-gray-500 mb-2">
                            Provides an alternative source of high-quality, free stock photos.
                        </p>
                        <input
                            type="text"
                            id="pexels-key"
                            value={pexelsKey}
                            onChange={(e) => setPexelsKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Pexels API Key"
                        />
                    </div>
                     <div>
                        <label htmlFor="pixabay-key" className="block text-sm font-medium text-gray-700">Pixabay API Key</label>
                        <p className="text-xs text-gray-500 mb-2">
                            Another large library of free images for your slides.
                        </p>
                        <input
                            type="text"
                            id="pixabay-key"
                            value={pixabayKey}
                            onChange={(e) => setPixabayKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Pixabay API Key"
                        />
                    </div>
                    <div>
                        <label htmlFor="giphy-key" className="block text-sm font-medium text-gray-700">Giphy API Key</label>
                        <p className="text-xs text-gray-500 mb-2">
                           Enables searching for animated GIFs from Giphy.
                        </p>
                        <input
                            type="text"
                            id="giphy-key"
                            value={giphyKey}
                            onChange={(e) => setGiphyKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Giphy API Key"
                        />
                    </div>
                     <div>
                        <label htmlFor="tenor-key" className="block text-sm font-medium text-gray-700">Tenor API Key</label>
                        <p className="text-xs text-gray-500 mb-2">
                           Provides an alternative source for animated GIFs.
                        </p>
                        <input
                            type="text"
                            id="tenor-key"
                            value={tenorKey}
                            onChange={(e) => setTenorKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your Tenor API Key"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 font-semibold">Save</button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;