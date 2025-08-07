import React, { useEffect, useRef } from 'react';
import { Slide } from '../types';
import { SlideRenderer } from './PresentationView';

interface PrintViewProps {
  slides: Slide[];
  onPrintFinished: () => void;
}

const PrintView: React.FC<PrintViewProps> = ({ slides, onPrintFinished }) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = printContainerRef.current;
    if (!container) return;

    // Find all images within the print container
    const images = Array.from(container.getElementsByTagName('img'));
    
    // Create a promise for each image to wait for it to load
    const imagePromises = images.map(img => {
        return new Promise<void>(resolve => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve on error too to not block printing
            }
        });
    });

    // When all images are loaded, trigger the print dialog
    Promise.all(imagePromises).then(() => {
        window.print();
        onPrintFinished();
    });

  }, [slides, onPrintFinished]);

  return (
    <div id="print-view-container" ref={printContainerRef}>
      {slides.map(slide => (
        <div key={slide.id} className="print-page">
          <div className="print-slide-wrapper">
            <SlideRenderer slide={slide} scale={1} isStatic={true} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintView;