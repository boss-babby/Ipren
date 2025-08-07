import React from 'react';
import { Slide } from '../types';

interface SlideFormatPanelProps {
  slide: Slide;
  onUpdateSlide: (props: Partial<Slide>) => void;
}

const PanelSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">{title}</h4>
        <div className="space-y-3 bg-white p-3 rounded-md border border-gray-200">
            {children}
        </div>
    </div>
);

const LabelledControl: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">{label}</label>
        {children}
    </div>
);


const SlideFormatPanel: React.FC<SlideFormatPanelProps> = ({ slide, onUpdateSlide }) => {
  return (
    <PanelSection title="Slide Background">
      <LabelledControl label="Color">
        <input
          type="color"
          aria-label="Slide background color"
          value={slide.backgroundColor}
          onChange={(e) => onUpdateSlide({ backgroundColor: e.target.value })}
          className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"
        />
      </LabelledControl>
      {slide.backgroundImage && (
        <div className="pt-2">
            <button 
                onClick={() => onUpdateSlide({ backgroundImage: undefined })}
                className="w-full text-sm text-red-600 hover:text-red-800"
            >
                Remove Background Image
            </button>
        </div>
      )}
    </PanelSection>
  );
};

export default SlideFormatPanel;
