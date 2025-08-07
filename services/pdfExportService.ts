import React from 'react';
import ReactDOM from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Slide } from '../types';
import { SlideRenderer } from '../components/PresentationView';

// Helper to ensure images, especially those from external sources, are loaded before capturing
const waitForImages = (element: HTMLElement): Promise<void[]> => {
    const images = Array.from(element.getElementsByTagName('img'));
    const promises = images.map(img => {
        return new Promise<void>((resolve) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve even on error to not block the export
            }
        });
    });
    return Promise.all(promises);
};


export const exportSlidesToPdf = async (slides: Slide[]): Promise<void> => {
    // 1. Create a hidden container for rendering slides
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px'; // Position off-screen
    container.style.top = '0px';
    container.style.width = '1280px';
    container.style.height = '720px';
    document.body.appendChild(container);

    // 2. Initialize PDF
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720]
    });

    const root = ReactDOM.createRoot(container);

    try {
        // 3. Loop and capture each slide
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];

            // Render the slide using React into our hidden container
            await new Promise<void>(resolve => {
                root.render(
                    React.createElement('div', { style: { width: '1280px', height: '720px' } },
                        React.createElement(SlideRenderer, { slide, scale: 1, isStatic: true })
                    )
                );
                // In React 18, render is async. We resolve the promise and then wait
                // for the DOM to update with the setTimeout below.
                resolve();
            });

            // Wait for images to load and for rendering to settle
            await waitForImages(container);
            await new Promise(resolve => setTimeout(resolve, 500)); // Additional delay for complex rendering

            const canvas = await html2canvas(container, {
                width: 1280,
                height: 720,
                scale: 2, // Capture at 2x resolution for better quality
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use high-quality JPEG

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
        }

        // 4. Save the PDF
        pdf.save('presentation.pdf');
    } catch (error) {
        console.error("Error during PDF export process:", error);
        throw error; // Re-throw to be caught by the UI
    } finally {
        // 5. Cleanup
        root.unmount();
        document.body.removeChild(container);
    }
};