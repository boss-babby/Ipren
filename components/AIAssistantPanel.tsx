import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Slide, SlideElement, Theme, TransitionType } from '../types';
import { generateSlideContent, generatePresentationOutline, modifyPresentationOutline, FilePart, SlideOutline } from '../services/aiArchitectService';
import { AIAssistantIcon, LoadingSpinner, CloseIcon, PaperclipIcon } from './icons';

interface AIAssistantPanelProps {
    onAddElements: (elements: SlideElement[]) => void;
    onGenerateFullPresentation: (slides: Slide[], canvasColor?: string) => void;
    onClose: () => void;
    onUpdateCurrentSlide: (props: Partial<Slide>) => void;
    onCanvasColorChange: (color: string) => void;
    currentTheme: Theme;
}

type GenerationState = 'idle' | 'generatingOutline' | 'awaitingConfirmation' | 'generatingSlides' | 'modifyingOutline';

interface UploadedFile {
  name: string;
  mimeType: string;
  data: string; // base64
}

interface Message {
    id: string;
    sender: 'user' | 'ai' | 'system';
    text: string;
}

const formatAiMessage = (text: string): string => {
  let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safeText = safeText.replace(/(?:^\s*\*\s.*(?:\r\n?|\n|$))+/gm, (match) => {
    const items = match.trim().split(/\r\n?|\n/);
    return `<ul class="list-disc list-inside ml-4">${items.map(item => `<li>${item.replace(/^\s*\*\s/, '')}</li>`).join('')}</ul>`;
  });
  return safeText.replace(/\r\n?|\n/g, '<br />').replace(/<br \/>(\s*<ul>)/g, '$1').replace(/(<\/ul>\s*)<br \/>/g, '$1');
};

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ onAddElements, onGenerateFullPresentation, onClose, onUpdateCurrentSlide, onCanvasColorChange, currentTheme }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'ai', text: "Hello! How can I help you? I can design a single slide or generate a full presentation on a topic. You can also upload PDFs or images for context." }
    ]);
    const [isFullPresentation, setIsFullPresentation] = useState(false);
    const [numberOfSlides, setNumberOfSlides] = useState(5);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    
    const [generationState, setGenerationState] = useState<GenerationState>('idle');
    const [currentOutline, setCurrentOutline] = useState<SlideOutline[] | null>(null);
    const [activeTheme, setActiveTheme] = useState<Theme>(currentTheme);
    const [originalTopic, setOriginalTopic] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 140 });

    const isLoading = ['generatingOutline', 'generatingSlides', 'modifyingOutline'].includes(generationState);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentOutline]);
    useEffect(() => { setActiveTheme(currentTheme) }, [currentTheme]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        const handleMouseMove = (moveEvent: MouseEvent) => setPosition({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = (e.target?.result as string).split(',')[1];
                if (base64Data) setUploadedFiles(prev => [...prev, { name: file.name, mimeType: file.type, data: base64Data }]);
            };
            reader.readAsDataURL(file);
        });
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: trimmedPrompt };
        setMessages(prev => [...prev, userMessage]);
        setPrompt('');

        if (generationState === 'awaitingConfirmation') {
            await handleModificationRequest(trimmedPrompt);
        } else {
            await handleNewRequest(trimmedPrompt);
        }
    };

    const handleNewRequest = async (userPrompt: string) => {
        if (isFullPresentation) {
            setGenerationState('generatingOutline');
            setOriginalTopic(userPrompt);
            try {
                const fileParts: FilePart[] = uploadedFiles.map(f => ({ mimeType: f.mimeType, data: f.data }));
                const result = await generatePresentationOutline(userPrompt, activeTheme, numberOfSlides, fileParts);
                
                setActiveTheme(result.newTheme || activeTheme);
                if (result.canvasColor) onCanvasColorChange(result.canvasColor);
                
                setCurrentOutline(result.outline);
                setGenerationState('awaitingConfirmation');
                
                const outlineText = result.outline.map((s, i) => `**Slide ${i + 1}:** ${s.title}`).join('\n');
                setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `I've created an outline for you:\n\n${outlineText}\n\nWould you like me to proceed with generating the slides, or would you like to make changes?` }]);

            } catch (error) {
                console.error("Error generating outline:", error);
                setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `I'm sorry, I encountered an error while creating the outline. ${error instanceof Error ? error.message : ''}` }]);
                setGenerationState('idle');
            }
        } else {
            // Single slide generation
            setGenerationState('generatingSlides');
            try {
                const fileParts: FilePart[] = uploadedFiles.map(f => ({ mimeType: f.mimeType, data: f.data }));
                const { elements, slideProps, canvasColor } = await generateSlideContent(userPrompt, activeTheme, fileParts);

                if (elements.length > 0) {
                    onAddElements(elements);
                    onUpdateCurrentSlide(slideProps);
                    if (canvasColor) onCanvasColorChange(canvasColor);
                    setMessages(prev => [...prev, { id: uuidv4(), sender: 'system', text: 'Slide content has been added.' }]);
                } else {
                    setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: "I couldn't generate any content for that. Could you try a different prompt?" }]);
                }
            } catch (error) {
                console.error("Error generating slide content:", error);
                 setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `I'm sorry, I encountered an error. ${error instanceof Error ? error.message : ''}` }]);
            } finally {
                setGenerationState('idle');
            }
        }
        setUploadedFiles([]); // Clear files after use
    };

    const handleModificationRequest = async (modificationPrompt: string) => {
        if (!currentOutline) return;
        setGenerationState('modifyingOutline');
        try {
            const fileParts: FilePart[] = uploadedFiles.map(f => ({ mimeType: f.mimeType, data: f.data }));
            const result = await modifyPresentationOutline(currentOutline, modificationPrompt, fileParts);
            setCurrentOutline(result.outline);
            
            const outlineText = result.outline.map((s, i) => `**Slide ${i + 1}:** ${s.title}`).join('\n');
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `Here is the updated outline:\n\n${outlineText}\n\nShall I proceed?` }]);

        } catch (error) {
            console.error("Error modifying outline:", error);
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `Sorry, I had trouble with that modification. ${error instanceof Error ? error.message : ''}` }]);
        } finally {
            setGenerationState('awaitingConfirmation');
            setUploadedFiles([]);
        }
    };
    
    const handleConfirmOutline = async () => {
        if (!currentOutline) return;
        setGenerationState('generatingSlides');
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'system', text: `Generating ${currentOutline.length} slides... This may take a moment.` }]);
        
        try {
            const newSlides: Slide[] = [];
            for (const [index, slideOutline] of currentOutline.entries()) {
                 setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.sender === 'system') {
                        lastMessage.text = `Generating slide ${index + 1} of ${currentOutline.length}: ${slideOutline.title}`;
                        return [...prev];
                    }
                    return prev;
                });

                const { elements, slideProps } = await generateSlideContent(slideOutline.contentPrompt, activeTheme);
                const newSlide: Slide = {
                    id: uuidv4(),
                    elements,
                    notes: '',
                    backgroundColor: slideProps.backgroundColor || activeTheme.colors.background,
                    transition: slideProps.transition || { type: TransitionType.NONE, duration: 500 },
                    backgroundImage: slideProps.backgroundImage,
                };
                newSlides.push(newSlide);
            }

            onGenerateFullPresentation(newSlides, activeTheme.id === 'ai-generated' ? activeTheme.colors.canvas : undefined);
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: "Your new presentation is ready!" }]);
            handleCancel();

        } catch (error) {
            console.error("Error generating full presentation:", error);
            setMessages(prev => [...prev, { id: uuidv4(), sender: 'ai', text: `I'm sorry, an error occurred while generating the slides. ${error instanceof Error ? error.message : ''}` }]);
            setGenerationState('awaitingConfirmation'); // Allow user to try again
        }
    };

    const handleCancel = () => {
        setGenerationState('idle');
        setCurrentOutline(null);
        setOriginalTopic('');
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'system', text: "Presentation generation cancelled." }]);
    };
    
    return (
        <div
            ref={panelRef}
            className="fixed w-[400px] h-[600px] bg-gray-50 rounded-lg shadow-2xl border border-gray-300 flex flex-col font-sans"
            style={{ top: position.y, left: position.x, zIndex: 1001 }}
        >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*,.pdf" />
            <div onMouseDown={handleDragStart} className="flex items-center justify-between p-2 bg-slate-700 text-white rounded-t-lg cursor-move">
                <h3 className="font-semibold text-sm flex items-center space-x-2">
                    <AIAssistantIcon />
                    <span>AI Assistant</span>
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'system' ? (
                             <p className="text-xs text-gray-500 italic text-center w-full">{msg.text}</p>
                        ) : (
                            <div className={`rounded-lg px-3 py-2 max-w-xs text-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                <p dangerouslySetInnerHTML={{ __html: formatAiMessage(msg.text) }} />
                            </div>
                        )}
                    </div>
                ))}

                {generationState === 'awaitingConfirmation' && (
                    <div className="flex justify-center space-x-2 p-2">
                        <button onClick={handleConfirmOutline} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">
                            Looks Good, Proceed
                        </button>
                        <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 text-sm">
                            Cancel
                        </button>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t bg-white rounded-b-lg">
                <form onSubmit={handleSubmit}>
                    {uploadedFiles.length > 0 && (
                        <div className="mb-2 text-xs">
                           <p className="font-semibold">Attachments:</p>
                           <ul className="flex flex-wrap gap-2 mt-1">
                               {uploadedFiles.map((file, index) => (
                                   <li key={index} className="bg-gray-200 rounded-full px-2 py-1 flex items-center">
                                       <span>{file.name}</span>
                                       <button type="button" onClick={() => setUploadedFiles(f => f.filter((_, i) => i !== index))} className="ml-2 text-gray-500 hover:text-gray-800">&times;</button>
                                   </li>
                               ))}
                           </ul>
                        </div>
                    )}
                    <div className="flex items-start space-x-2">
                         <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e as any); }}
                            placeholder={generationState === 'awaitingConfirmation' ? "Describe your changes..." : "Describe what you want..."}
                            className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            rows={2}
                            disabled={isLoading}
                        />
                         <button
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="px-4 h-[44px] bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                        >
                            {isLoading ? <LoadingSpinner /> : 'Send'}
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 h-[44px] border rounded-md hover:bg-gray-100"
                            title="Attach Files"
                        >
                            <PaperclipIcon />
                        </button>
                    </div>
                    {generationState !== 'awaitingConfirmation' && (
                        <div className="mt-2 flex items-center">
                            <input
                                id="full-presentation-toggle"
                                type="checkbox"
                                checked={isFullPresentation}
                                onChange={(e) => setIsFullPresentation(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <label htmlFor="full-presentation-toggle" className="ml-2 text-sm text-gray-700">
                                Generate full presentation
                            </label>
                            {isFullPresentation && (
                                <input
                                    type="number"
                                    value={numberOfSlides}
                                    onChange={e => setNumberOfSlides(parseInt(e.target.value, 10) || 1)}
                                    className="w-16 ml-2 p-1 border border-gray-300 rounded-md text-sm"
                                    min="1" max="30"
                                />
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default AIAssistantPanel;