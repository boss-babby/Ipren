import React from 'react';
import { Theme, themes } from '../types';

interface DesignerPanelProps {
    onSelectTheme: (themeId: string) => void;
}

const ThemePreview: React.FC<{ theme: Theme }> = ({ theme }) => {
    // A simplified visual representation of the theme
    return (
        <div className="w-full h-full flex flex-col" style={{ background: theme.colors.background }}>
            <div className="flex-1 p-2 flex items-start justify-center">
                <div style={{ color: theme.colors.text, fontFamily: theme.fonts.heading, fontSize: '0.8rem', fontWeight: 'bold' }}>Title</div>
            </div>
            <div className="flex-shrink-0 h-1/3 flex items-center justify-evenly p-1">
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.primary }}></div>
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.secondary }}></div>
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.accent }}></div>
            </div>
        </div>
    );
};


const DesignerPanel: React.FC<DesignerPanelProps> = ({ onSelectTheme }) => {
    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Presentation Themes</h3>
            <div className="space-y-4">
                {themes.map((theme) => (
                   <div key={theme.id}>
                        <p className="text-sm font-medium text-gray-700 mb-1">{theme.name}</p>
                        <button 
                            onClick={() => onSelectTheme(theme.id)} 
                            className="w-full block border-2 border-gray-200 hover:border-slate-700 focus:border-slate-800 focus:outline-none transition-all rounded-md overflow-hidden shadow-sm aspect-[16/9]"
                            aria-label={`Select ${theme.name} theme`}
                        >
                            <ThemePreview theme={theme} />
                        </button>
                   </div>
                ))}
            </div>
        </div>
    );
};

export default DesignerPanel;