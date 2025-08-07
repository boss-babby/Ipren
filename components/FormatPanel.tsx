import React from 'react';
import { Slide, SlideElement } from '../types';
import ElementFormatPanel from './ElementFormatPanel';
import SlideFormatPanel from './SlideFormatPanel';

interface FormatPanelProps {
  selectedElement: SlideElement | null;
  slide: Slide;
  onUpdateElement: (id: string, props: Partial<SlideElement>) => void;
  onUpdateSlide: (props: Partial<Slide>) => void;
}

const FormatPanel: React.FC<FormatPanelProps> = ({
  selectedElement,
  slide,
  onUpdateElement,
  onUpdateSlide,
}) => {
  return (
    <div className="p-4 space-y-6">
      {selectedElement ? (
        <ElementFormatPanel 
          element={selectedElement} 
          onUpdateElement={onUpdateElement} 
        />
      ) : (
        <SlideFormatPanel 
          slide={slide} 
          onUpdateSlide={onUpdateSlide} 
        />
      )}
    </div>
  );
};

export default FormatPanel;
