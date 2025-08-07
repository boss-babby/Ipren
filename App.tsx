import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Slide, ElementType, SlideElement, TextElement, Theme, TransitionType, Animation, AnimationEffect, ImageElement, IconElement, BaseElement, GroupElement, ChartElement, ChartDataPoint, SmartArtNode, SmartArtElement } from './types';
import { themes, getThemeById, defaultTheme } from './types';
import Ribbon from './components/Ribbon';
import SlideThumbnail from './components/SlideThumbnail';
import SlideEditor from './components/SlideEditor';
import PresentationView from './components/PresentationView';
import AIAssistantPanel from './components/AIAssistantPanel';
import AnimationPane from './components/AnimationPane';
import { setUnsplashApiKey, setPexelsApiKey, setPixabayApiKey, setGiphyApiKey, setTenorApiKey } from './services/aiArchitectService';
import { exportToPptx } from './services/exportService';
import PrintView from './components/PrintView';
import ImageSearchModal from './components/ImageSearchModal';
import IconSearchModal from './components/IconSearchModal';
import GifSearchModal from './components/GifSearchModal';
import ContextMenu, { MenuItem } from './components/ContextMenu';
import ChartDataEditorModal from './components/ChartDataEditorModal';
import { NewSlideIcon, TrashIcon, DuplicateIcon, CopyIcon, PasteIcon, CutIcon, BringForwardIcon, SendBackwardIcon, BringToFrontIcon, SendToBackIcon, SvgIcon, PicturesIcon, ReplaceImageIcon, ReplaceIconIcon, SearchIcon, GroupIcon, UngroupIcon, EditDataIcon, GifIcon, ReplaceGifIcon } from './components/icons';

export type DrawingTool = 'free' | 'line' | 'circle';
export interface DrawingState {
  isActive: boolean;
  tool: DrawingTool | null;
}

type ClipboardContent = { type: 'slide'; content: Slide; } | { type: 'element'; content: SlideElement; };

// Custom hook for managing state history (undo/redo)
const useHistoryState = <T,>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const state = history[currentIndex];
    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    const setState = useCallback((newState: T) => {
        // Prevent adding duplicate states to history
        if (JSON.stringify(newState) === JSON.stringify(history[currentIndex])) {
            return;
        }
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [history, currentIndex]);

    const undo = useCallback(() => {
        if (canUndo) {
            setCurrentIndex(c => c - 1);
        }
    }, [canUndo]);

    const redo = useCallback(() => {
        if (canRedo) {
            setCurrentIndex(c => c + 1);
        }
    }, [canRedo]);

    return { state, setState, undo, redo, canUndo, canRedo };
};


const createNewSlide = (type: 'title' | 'content', theme: Theme): Slide => {
  const baseSlide = {
    id: uuidv4(),
    notes: '',
    backgroundColor: theme.colors.background,
    elements: [],
    transition: { type: TransitionType.NONE, duration: 500 },
  };

  if (type === 'title') {
    return {
      ...baseSlide,
      elements: [
        { id: uuidv4(), type: ElementType.TITLE, content: 'Click to add title', x: 100, y: 200, width: 1080, height: 150, rotation: 0, fontSize: 88, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', fontFamily: theme.fonts.heading, color: theme.colors.text },
        { id: uuidv4(), type: ElementType.SUBTITLE, content: 'Click to add subtitle', x: 100, y: 350, width: 1080, height: 100, rotation: 0, fontSize: 32, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', fontFamily: theme.fonts.body, color: theme.colors.text },
      ]
    };
  }
  
  return {
    ...baseSlide,
    elements: [
      { id: uuidv4(), type: ElementType.TITLE, content: 'Click to add title', x: 50, y: 30, width: 1180, height: 100, rotation: 0, fontSize: 48, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', fontFamily: theme.fonts.heading, color: theme.colors.text },
      { id: uuidv4(), type: ElementType.CONTENT, content: 'Click to add text', x: 50, y: 150, width: 1180, height: 400, rotation: 0, fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', fontFamily: theme.fonts.body, color: theme.colors.text },
    ]
  };
};

const cloneElementWithNewIds = (element: SlideElement): SlideElement => {
    // Deep clone the element to avoid any shared references.
    const newElement: SlideElement = JSON.parse(JSON.stringify(element));

    // Recursively assign new IDs to the element and its children.
    const assignNewIds = (el: SlideElement): SlideElement => {
        el.id = uuidv4();
        if (el.type === ElementType.GROUP) {
            el.children = el.children.map(assignNewIds);
        }
        if (el.type === ElementType.SMART_ART) {
            const assignNodeIds = (node: SmartArtNode) => {
                node.id = uuidv4();
                node.children.forEach(assignNodeIds);
            };
            assignNodeIds(el.data);
        }
        return el;
    };
    
    return assignNewIds(newElement);
};

const App: React.FC = () => {
  const [themeId, setThemeId] = useState<string>(defaultTheme.id);
  const { state: slides, setState: setSlides, undo, redo, canUndo, canRedo } = useHistoryState<Slide[]>([createNewSlide('title', defaultTheme)]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isAIAssistantVisible, setIsAIAssistantVisible] = useState(false);
  const [isAnimationPaneVisible, setIsAnimationPaneVisible] = useState(false);
  const [imageSearchContext, setImageSearchContext] = useState<{isOpen: boolean; forReplaceId: string | null}>({ isOpen: false, forReplaceId: null });
  const [iconSearchContext, setIconSearchContext] = useState<{isOpen: boolean; forReplaceId: string | null}>({ isOpen: false, forReplaceId: null });
  const [gifSearchContext, setGifSearchContext] = useState<{isOpen: boolean; forReplaceId: string | null}>({ isOpen: false, forReplaceId: null });
  const [chartEditorContext, setChartEditorContext] = useState<{ isOpen: boolean; chartId: string | null }>({ isOpen: false, chartId: null });
  const [canvasColor, setCanvasColor] = useState<string>(defaultTheme.colors.canvas);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [drawingState, setDrawingState] = useState<DrawingState>({ isActive: false, tool: null });
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: MenuItem[] }>({ isOpen: false, x: 0, y: 0, items: [] });
  const [clipboard, setClipboard] = useState<ClipboardContent | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const imageReplaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingIconId, setReplacingIconId] = useState<string | null>(null);
  const iconReplaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingGifId, setReplacingGifId] = useState<string | null>(null);
  const gifReplaceInputRef = useRef<HTMLInputElement>(null);
  
  const currentTheme = getThemeById(themeId);

  useEffect(() => {
    const storedUnsplashKey = localStorage.getItem('unsplashApiKey');
    if (storedUnsplashKey) setUnsplashApiKey(storedUnsplashKey);
    
    const storedPexelsKey = localStorage.getItem('pexelsApiKey');
    if (storedPexelsKey) setPexelsApiKey(storedPexelsKey);

    const storedPixabayKey = localStorage.getItem('pixabayApiKey');
    if (storedPixabayKey) setPixabayApiKey(storedPixabayKey);
    
    const storedGiphyKey = localStorage.getItem('giphyApiKey');
    if (storedGiphyKey) setGiphyApiKey(storedGiphyKey);
    
    const storedTenorKey = localStorage.getItem('tenorApiKey');
    if (storedTenorKey) setTenorApiKey(storedTenorKey);
  }, []);

  const handleSaveApiKeys = (keys: { unsplash: string; pexels: string; pixabay: string; giphy: string; tenor: string; }) => {
    Object.entries(keys).forEach(([key, value]) => {
        const serviceName = key.charAt(0).toUpperCase() + key.slice(1);
        const storageKey = `${key}ApiKey`;
        const setterFn = {
            unsplash: setUnsplashApiKey,
            pexels: setPexelsApiKey,
            pixabay: setPixabayApiKey,
            giphy: setGiphyApiKey,
            tenor: setTenorApiKey,
        }[key as keyof typeof keys];

        if (value) {
            localStorage.setItem(storageKey, value);
            setterFn?.(value);
        } else {
            localStorage.removeItem(storageKey);
            setterFn?.(null);
        }
    });
    alert('API Keys saved successfully!');
  };

  const handleExportToPptx = async () => {
    setIsExporting(true);
    try {
        await exportToPptx(slides, 'AI Presentation Architect');
    } catch (error) {
        console.error("Failed to export presentation:", error);
        alert("An error occurred while exporting the presentation. Please check the console for details.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportToPdf = () => setIsPrinting(true);

  const handleSetTheme = useCallback((newThemeId: string) => {
    const newTheme = getThemeById(newThemeId);
    setThemeId(newThemeId);
    setCanvasColor(newTheme.colors.canvas);
    const newSlides = slides.map(slide => {
        const updatedElements = slide.elements.map((el): SlideElement => {
            if (el.type === ElementType.TITLE || el.type === ElementType.SUBTITLE || el.type === ElementType.CONTENT) {
                const updatedTextElement: TextElement = {
                    ...(el as TextElement),
                    color: newTheme.colors.text,
                    fontFamily: el.type === ElementType.TITLE ? newTheme.fonts.heading : newTheme.fonts.body,
                };
                return updatedTextElement;
            }
            return el;
        });
        return { ...slide, backgroundColor: newTheme.colors.background, backgroundImage: undefined, elements: updatedElements };
    });
    setSlides(newSlides);
  }, [slides, setSlides]);

  const handleNewSlide = useCallback(() => {
    const newSlide = createNewSlide('content', currentTheme);
    const newIndex = currentSlideIndex + 1;
    const newSlides = [...slides.slice(0, newIndex), newSlide, ...slides.slice(newIndex)];
    setSlides(newSlides);
    setCurrentSlideIndex(newIndex);
    setSelectedElementIds([]);
  }, [currentSlideIndex, currentTheme, slides, setSlides]);

  const updateSlide = useCallback((index: number, updatedSlide: Slide) => {
    const newSlides = slides.map((slide, i) => (i === index ? updatedSlide : slide));
    setSlides(newSlides);
  }, [slides, setSlides]);
  
  const updateCurrentSlide = useCallback((props: Partial<Slide>) => {
      const currentSlide = slides[currentSlideIndex];
      if (currentSlide) {
          updateSlide(currentSlideIndex, { ...currentSlide, ...props });
      }
  }, [currentSlideIndex, slides, updateSlide]);

  const updateElement = (elementId: string, props: Partial<SlideElement>) => {
    updateElements([{id: elementId, props}]);
  };
  
  const updateElements = (updates: Array<{id: string, props: Partial<SlideElement>}>) => {
      const currentSlide = slides[currentSlideIndex];
      if (!currentSlide || updates.length === 0) return;
      const updatesMap = new Map(updates.map(u => [u.id, u.props]));
      
      const updatedElements = currentSlide.elements.map((el): SlideElement => {
          if (!updatesMap.has(el.id)) return el;

          const updatedProps = updatesMap.get(el.id)!;
          
          if (el.type === ElementType.GROUP) {
              const oldGroup = el;
              const newGroupState = { ...oldGroup, ...updatedProps };

              let newChildren = oldGroup.children;
              // Proportional resizing for groups
              if (updatedProps.width || updatedProps.height) {
                  const scaleX = newGroupState.width / oldGroup.width;
                  const scaleY = newGroupState.height / oldGroup.height;
                  
                  newChildren = oldGroup.children.map(child => {
                      const newChild = JSON.parse(JSON.stringify(child)) as SlideElement;
                      newChild.x *= scaleX;
                      newChild.y *= scaleY;
                      newChild.width *= scaleX;
                      newChild.height *= scaleY;

                      if (newChild.type === ElementType.TITLE || newChild.type === ElementType.SUBTITLE || newChild.type === ElementType.CONTENT) {
                          (newChild as TextElement).fontSize *= Math.min(scaleX, scaleY);
                      }
                      return newChild;
                  });
              }

              // Re-construct the group to ensure type safety and discard any invalid properties from `updatedProps`
              const finalGroup: GroupElement = {
                  id: newGroupState.id,
                  x: newGroupState.x,
                  y: newGroupState.y,
                  width: newGroupState.width,
                  height: newGroupState.height,
                  rotation: newGroupState.rotation,
                  animation: newGroupState.animation,
                  type: ElementType.GROUP,
                  children: newChildren,
              };
              return finalGroup;
          }

          // Using a type assertion is the most practical way to handle updates to a
          // discriminated union where the property updates are partial and dynamic.
          // We trust that the calling code (e.g., FormatToolbar, context menus) sends
          // valid properties for the element's type. This fixes the type inference issue.
          return { ...el, ...updatedProps } as SlideElement;
      });
      updateSlide(currentSlideIndex, { ...currentSlide, elements: updatedElements });
  };
  
  const addElement = useCallback((element: SlideElement) => {
      const currentSlide = slides[currentSlideIndex];
      const updatedElements = [...currentSlide.elements, element];
      updateSlide(currentSlideIndex, { ...currentSlide, elements: updatedElements });
      setSelectedElementIds([element.id]);
  }, [currentSlideIndex, slides, updateSlide]);

  const addElements = (elements: SlideElement[]) => {
      if (elements.length === 0) return;
      const currentSlide = slides[currentSlideIndex];
      const updatedElements = [...currentSlide.elements, ...elements];
      updateSlide(currentSlideIndex, { ...currentSlide, elements: updatedElements });
      setSelectedElementIds([]);
  };

  const handleGenerateFullPresentation = (newSlides: Slide[], presentationCanvasColor?: string) => {
    if (newSlides.length > 0) {
      setSlides(newSlides);
      setCurrentSlideIndex(0);
      setSelectedElementIds([]);
      setIsAIAssistantVisible(false);
      if (presentationCanvasColor) setCanvasColor(presentationCanvasColor);
    }
  };
  
  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;
    const updatedElements = currentSlide.elements.filter(el => !selectedElementIds.includes(el.id));
    updateSlide(currentSlideIndex, { ...currentSlide, elements: updatedElements });
    setSelectedElementIds([]);
  }, [currentSlideIndex, slides, updateSlide, selectedElementIds]);

  const deleteSlide = useCallback((slideId: string) => {
    const slideIndexToDelete = slides.findIndex(s => s.id === slideId);
    if (slideIndexToDelete === -1) return;
    let newCurrentIndex = currentSlideIndex;
    if (slides.length <= 1) newCurrentIndex = 0;
    else if (slideIndexToDelete < currentSlideIndex) newCurrentIndex = currentSlideIndex - 1;
    else if (slideIndexToDelete === currentSlideIndex) newCurrentIndex = Math.max(0, currentSlideIndex - 1);
    
    const filteredSlides = slides.filter(s => s.id !== slideId);
    const newSlides = filteredSlides.length === 0 ? [createNewSlide('title', currentTheme)] : filteredSlides;
    setSlides(newSlides);
    setCurrentSlideIndex(newCurrentIndex);
    setSelectedElementIds([]);
  }, [slides, currentSlideIndex, currentTheme, setSlides]);

  const handleReorderSlides = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const newSlides = [...slides];
    const draggedIndex = newSlides.findIndex(s => s.id === draggedId);
    if (draggedIndex === -1) return;
    const [draggedItem] = newSlides.splice(draggedIndex, 1);
    const targetIndex = newSlides.findIndex(s => s.id === targetId);
    if (targetIndex !== -1) newSlides.splice(targetIndex, 0, draggedItem);
    else newSlides.push(draggedItem);
    
    const currentSlideId = slides[currentSlideIndex].id;
    const newCurrentSlideIndex = newSlides.findIndex(s => s.id === currentSlideId);
    setCurrentSlideIndex(newCurrentSlideIndex);
    setSlides(newSlides);
  }, [slides, currentSlideIndex, setSlides]);

  const updateElementsLayer = useCallback((direction: 'front' | 'back' | 'forward' | 'backward') => {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide || selectedElementIds.length === 0) return;
    
    const elements = [...currentSlide.elements];
    const selected = elements.filter(el => selectedElementIds.includes(el.id));
    const unselected = elements.filter(el => !selectedElementIds.includes(el.id));

    let newElements: SlideElement[] = [];

    if (direction === 'front') {
        newElements = [...unselected, ...selected];
    } else if (direction === 'back') {
        newElements = [...selected, ...unselected];
    } else {
        const index = elements.findIndex(el => el.id === selectedElementIds[0]);
        if (index === -1) return;
        const [element] = elements.splice(index, 1);
        if (direction === 'forward') elements.splice(Math.min(index + 1, elements.length), 0, element);
        else if (direction === 'backward') elements.splice(Math.max(index - 1, 0), 0, element);
        newElements = elements;
    }
    
    updateSlide(currentSlideIndex, { ...currentSlide, elements: newElements });
  }, [currentSlideIndex, slides, updateSlide, selectedElementIds]);

  const alignElements = useCallback((alignment: 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right') => {
      const updates: Array<{id: string, props: Partial<BaseElement>}> = [];
      selectedElementIds.forEach(elementId => {
          const element = slides[currentSlideIndex]?.elements.find(el => el.id === elementId);
          if (!element) return;
          let newProps: Partial<SlideElement> = {};
          const SLIDE_WIDTH = 1280;
          const SLIDE_HEIGHT = 720;
          switch(alignment) {
              case 'left': newProps.x = 0; break;
              case 'center': newProps.x = (SLIDE_WIDTH - element.width) / 2; break;
              case 'right': newProps.x = SLIDE_WIDTH - element.width; break;
              case 'top': newProps.y = 0; break;
              case 'middle': newProps.y = (SLIDE_HEIGHT - element.height) / 2; break;
              case 'bottom': newProps.y = SLIDE_HEIGHT - element.height; break;
          }
          updates.push({id: elementId, props: newProps});
      });
      updateElements(updates);
  }, [currentSlideIndex, slides, selectedElementIds, updateElements]);

  const handleApplyTransitionToAll = useCallback(() => {
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide?.transition?.type !== TransitionType.NONE) {
        const newSlides = slides.map(s => ({ ...s, transition: { ...currentSlide.transition! } }));
        setSlides(newSlides);
    }
  }, [currentSlideIndex, slides, setSlides]);
  
  const handleReorderAnimations = useCallback((movedId: string, targetId: string | null) => {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;
    const reorderedElements = [...currentSlide.elements];
    const movedIndex = reorderedElements.findIndex(el => el.id === movedId);
    if (movedIndex === -1) return;
    const [movedItem] = reorderedElements.splice(movedIndex, 1);
    const targetIndex = targetId ? reorderedElements.findIndex(el => el.id === targetId) : reorderedElements.length;
    reorderedElements.splice(targetIndex, 0, movedItem);
    updateSlide(currentSlideIndex, { ...currentSlide, elements: reorderedElements });
  }, [currentSlideIndex, slides, updateSlide]);

  const handleSelectElement = (elementId: string | null, isShiftKey: boolean) => {
      if(drawingState.isActive) return;
      if (elementId === null) {
          setSelectedElementIds([]);
          return;
      }
      
      if(isShiftKey) {
          setSelectedElementIds(prev =>
              prev.includes(elementId) ? prev.filter(id => id !== elementId) : [...prev, elementId]
          );
      } else {
          setSelectedElementIds([elementId]);
      }
  };
  
  const handleSetSelection = (elementIds: string[]) => setSelectedElementIds(elementIds);

  const handleSetDrawingState = (state: DrawingState) => {
    if (state.isActive && selectedElementIds.length === 0) {
      setDrawingState({ isActive: false, tool: null });
      return;
    }
    setDrawingState(state);
  };
  
  const handleGroupElements = useCallback(() => {
    const currentSlide = slides[currentSlideIndex];
    const selected = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
    if (selected.length <= 1) return;

    const minX = Math.min(...selected.map(el => el.x));
    const minY = Math.min(...selected.map(el => el.y));
    const maxX = Math.max(...selected.map(el => el.x + el.width));
    const maxY = Math.max(...selected.map(el => el.y + el.height));

    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;

    const children: SlideElement[] = selected.map(el => {
        const clonedEl = JSON.parse(JSON.stringify(el)) as SlideElement;
        clonedEl.x = el.x - minX;
        clonedEl.y = el.y - minY;
        return clonedEl;
    });

    const groupElement: GroupElement = {
        id: uuidv4(),
        type: ElementType.GROUP,
        x: minX,
        y: minY,
        width: groupWidth,
        height: groupHeight,
        rotation: 0,
        children,
    };

    const remainingElements = currentSlide.elements.filter(el => !selectedElementIds.includes(el.id));
    updateSlide(currentSlideIndex, { ...currentSlide, elements: [...remainingElements, groupElement] });
    setSelectedElementIds([groupElement.id]);
  }, [currentSlideIndex, slides, selectedElementIds, updateSlide]);

  const handleUngroupElements = useCallback(() => {
    const currentSlide = slides[currentSlideIndex];
    const group = currentSlide.elements.find(el => selectedElementIds[0] === el.id && el.type === ElementType.GROUP) as GroupElement | undefined;
    if (!group) return;

    const ungroupedChildren: SlideElement[] = group.children.map(child => {
        const clonedChild = JSON.parse(JSON.stringify(child)) as SlideElement;
        clonedChild.x += group.x;
        clonedChild.y += group.y;
        return clonedChild;
    });

    const remainingElements = currentSlide.elements.filter(el => el.id !== group.id);
    updateSlide(currentSlideIndex, { ...currentSlide, elements: [...remainingElements, ...ungroupedChildren] });
    setSelectedElementIds(ungroupedChildren.map(child => child.id));
  }, [currentSlideIndex, slides, selectedElementIds, updateSlide]);


  // --- Context Menu and Clipboard Logic ---
  
  const showContextMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, items });
  };

  const hideContextMenu = useCallback(() => setContextMenu({ ...contextMenu, isOpen: false }), [contextMenu]);

  const handleCopyElement = useCallback((elementId: string) => {
    const element = slides[currentSlideIndex]?.elements.find(el => el.id === elementId);
    if (element) setClipboard({ type: 'element', content: element });
  }, [currentSlideIndex, slides]);
  
  const handleCutElement = useCallback((elementId: string) => {
    handleCopyElement(elementId);
    deleteSelectedElements();
  }, [handleCopyElement, deleteSelectedElements]);

  const handlePasteElement = useCallback(() => {
    if (clipboard?.type === 'element') {
        const newElement = cloneElementWithNewIds(clipboard.content);
        newElement.x += 20;
        newElement.y += 20;
        addElement(newElement);
    }
  }, [clipboard, addElement]);

  const handleDuplicateSlide = useCallback((slideId: string) => {
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) return;
    const originalSlide = slides[slideIndex];
    const newSlide: Slide = {
      ...originalSlide,
      id: uuidv4(),
      elements: originalSlide.elements.map(el => cloneElementWithNewIds(el)),
    };
    const newSlides = [...slides.slice(0, slideIndex + 1), newSlide, ...slides.slice(slideIndex + 1)];
    setSlides(newSlides);
    setCurrentSlideIndex(slideIndex + 1);
  }, [slides, setSlides]);
  
  const handleCopySlide = useCallback((slideId: string) => {
      const slide = slides.find(s => s.id === slideId);
      if (slide) setClipboard({ type: 'slide', content: slide });
  }, [slides]);
  
  const handlePasteSlide = useCallback(() => {
      if (clipboard?.type === 'slide') {
          const newSlide: Slide = {
              ...clipboard.content,
              id: uuidv4(),
              elements: clipboard.content.elements.map(el => cloneElementWithNewIds(el)),
          };
          const newIndex = currentSlideIndex + 1;
          const newSlides = [...slides.slice(0, newIndex), newSlide, ...slides.slice(newIndex)];
          setSlides(newSlides);
          setCurrentSlideIndex(newIndex);
      }
  }, [clipboard, currentSlideIndex, slides, setSlides]);

  const handleReplaceImageTrigger = (elementId: string) => {
    setReplacingImageId(elementId);
    if (imageReplaceInputRef.current) {
        imageReplaceInputRef.current.click();
    }
  };
  
  const handleReplaceImageViaSearch = (elementId: string) => {
    setImageSearchContext({ isOpen: true, forReplaceId: elementId });
  };
  
  const handleSelectImageFromSearch = (src: string) => {
    if (imageSearchContext.forReplaceId) {
        updateElement(imageSearchContext.forReplaceId, { src });
    } else {
        addElement({
            id: uuidv4(), type: ElementType.IMAGE, src, x: 100, y: 100,
            width: 512, height: 341, rotation: 0,
            filters: { brightness: 100, contrast: 100 }
        });
    }
    setImageSearchContext({ isOpen: false, forReplaceId: null });
  };
  
  const handleSelectIconFromSearch = (svgString: string) => {
    if (iconSearchContext.forReplaceId) {
        updateElement(iconSearchContext.forReplaceId, { svgString });
    } else {
        addElement({
            id: uuidv4(), type: ElementType.ICON, svgString,
            color: '#333333',
            x: 150, y: 150, width: 100, height: 100, rotation: 0
        } as IconElement);
    }
    setIconSearchContext({ isOpen: false, forReplaceId: null });
  };

  const handleSelectGifFromSearch = (src: string) => {
      if (gifSearchContext.forReplaceId) {
          updateElement(gifSearchContext.forReplaceId, { src });
      } else {
          addElement({
              id: uuidv4(), type: ElementType.IMAGE, src, x: 100, y: 100,
              width: 480, height: 270, rotation: 0,
              filters: { brightness: 100, contrast: 100 }
          });
      }
      setGifSearchContext({ isOpen: false, forReplaceId: null });
  };

  const handleReplaceImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingImageId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
            updateElement(replacingImageId, { src: result });
        }
        setReplacingImageId(null);
    };
    reader.readAsDataURL(file);

    if (imageReplaceInputRef.current) {
        imageReplaceInputRef.current.value = '';
    }
  };
  
  const handleReplaceIconTrigger = (elementId: string) => {
    setReplacingIconId(elementId);
    if (iconReplaceInputRef.current) {
        iconReplaceInputRef.current.click();
    }
  };

  const handleReplaceIconViaSearch = (elementId: string) => {
    setIconSearchContext({ isOpen: true, forReplaceId: elementId });
  };
  
  const handleReplaceIconFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingIconId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
            updateElement(replacingIconId, { svgString: result });
        }
        setReplacingIconId(null);
    };
    reader.readAsText(file);

    if (iconReplaceInputRef.current) {
        iconReplaceInputRef.current.value = '';
    }
  };

  const handleReplaceGifTrigger = (elementId: string) => {
    setReplacingGifId(elementId);
    if (gifReplaceInputRef.current) {
        gifReplaceInputRef.current.click();
    }
  };

  const handleReplaceGifFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingGifId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
            updateElement(replacingGifId, { src: result });
        }
        setReplacingGifId(null);
    };
    reader.readAsDataURL(file);

    if (gifReplaceInputRef.current) {
        gifReplaceInputRef.current.value = '';
    }
  };

  const handleReplaceGifViaSearch = (elementId: string) => {
    setGifSearchContext({ isOpen: true, forReplaceId: elementId });
  };

  const handleOpenChartEditor = (chartId: string) => {
    setChartEditorContext({ isOpen: true, chartId });
  };

  const handleSaveChartData = (chartId: string, newData: ChartDataPoint[]) => {
      const chartElement = slides[currentSlideIndex]?.elements.find(el => el.id === chartId && el.type === ElementType.CHART) as ChartElement | undefined;
      if (!chartElement) return;

      const newKeys = newData.length > 0 ? Object.keys(newData[0]).filter(k => k !== 'name') : [];
      
      updateElement(chartId, { 
          data: newData,
          config: { ...chartElement.config, dataKeys: newKeys }
      });
  };

  const handleSlideThumbnailContextMenu = (e: React.MouseEvent, slideId: string) => {
    const items: MenuItem[] = [
        { label: 'New Slide', onClick: handleNewSlide, icon: <NewSlideIcon /> },
        { label: 'Duplicate Slide', onClick: () => handleDuplicateSlide(slideId), icon: <DuplicateIcon /> },
        { label: 'Delete Slide', onClick: () => deleteSlide(slideId), icon: <TrashIcon /> },
        { isSeparator: true },
        { label: 'Copy', onClick: () => handleCopySlide(slideId), icon: <CopyIcon /> },
        { label: 'Paste', onClick: handlePasteSlide, disabled: clipboard?.type !== 'slide', icon: <PasteIcon /> },
    ];
    showContextMenu(e, items);
  };
  
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    const items: MenuItem[] = [
        { label: 'Paste', onClick: handlePasteElement, disabled: clipboard?.type !== 'element', icon: <PasteIcon /> },
    ];
    
    if (selectedElementIds.length > 1) {
        items.push({ label: 'Group', onClick: handleGroupElements, icon: <GroupIcon /> });
    }
    
    if (selectedElementIds.length === 1 && slides[currentSlideIndex].elements.find(el => el.id === selectedElementIds[0])?.type === ElementType.GROUP) {
        items.push({ label: 'Ungroup', onClick: handleUngroupElements, icon: <UngroupIcon /> });
    }

    items.push(
        { isSeparator: true },
        { label: 'Format Background...', onClick: () => { /* Logic to open format pane could go here */ }, icon: <PicturesIcon/> },
    );
    showContextMenu(e, items);
  };
  
  const handleElementContextMenu = (e: React.MouseEvent, elementId: string) => {
    if (!selectedElementIds.includes(elementId)) {
      setSelectedElementIds([elementId]);
    }
    
    const element = slides[currentSlideIndex]?.elements.find(el => el.id === elementId);

    const menuItems: MenuItem[] = [];

    if (element?.type === ElementType.CHART && selectedElementIds.length === 1) {
        menuItems.push({ label: 'Edit Data...', onClick: () => handleOpenChartEditor(elementId), icon: <EditDataIcon /> }, { isSeparator: true });
    }

    menuItems.push(
        { label: 'Cut', onClick: () => handleCutElement(elementId), icon: <CutIcon />, disabled: selectedElementIds.length > 1 },
        { label: 'Copy', onClick: () => handleCopyElement(elementId), icon: <CopyIcon />, disabled: selectedElementIds.length > 1 },
        { label: 'Paste', onClick: handlePasteElement, disabled: clipboard?.type !== 'element', icon: <PasteIcon /> },
    );
    
    if (element?.type === ElementType.IMAGE && selectedElementIds.length === 1) {
        const isGif = (element as ImageElement).src.toLowerCase().endsWith('.gif');
        if (isGif) {
            menuItems.push({
                label: 'Replace GIF',
                icon: <ReplaceGifIcon />,
                subMenu: [
                    { label: 'From Device...', onClick: () => handleReplaceGifTrigger(elementId), icon: <GifIcon /> },
                    { label: 'Search Web...', onClick: () => handleReplaceGifViaSearch(elementId), icon: <SearchIcon /> }
                ]
            });
        } else {
            menuItems.push({
                label: 'Replace Picture',
                icon: <ReplaceImageIcon />,
                subMenu: [
                  { label: 'From Device...', onClick: () => handleReplaceImageTrigger(elementId), icon: <PicturesIcon /> },
                  { label: 'Search Web...', onClick: () => handleReplaceImageViaSearch(elementId), icon: <SearchIcon /> }
                ]
            });
        }
    }
    
    if (element?.type === ElementType.ICON && selectedElementIds.length === 1) {
        menuItems.push({
            label: 'Replace Icon',
            icon: <ReplaceIconIcon />,
            subMenu: [
              { label: 'From Device...', onClick: () => handleReplaceIconTrigger(elementId), icon: <SvgIcon /> },
              { label: 'Search Web...', onClick: () => handleReplaceIconViaSearch(elementId), icon: <SearchIcon /> }
            ]
        });
    }

    menuItems.push(
      { isSeparator: true },
      { label: `Delete ${selectedElementIds.length > 1 ? 'Elements' : 'Element'}`, onClick: deleteSelectedElements, icon: <TrashIcon /> },
      { isSeparator: true }
    );

    if (selectedElementIds.length > 1) {
        menuItems.push({ label: 'Group', onClick: handleGroupElements, icon: <GroupIcon /> });
    }
    
    if (selectedElementIds.length === 1 && element?.type === ElementType.GROUP) {
        menuItems.push({ label: 'Ungroup', onClick: handleUngroupElements, icon: <UngroupIcon /> });
    }

    menuItems.push(
      { label: 'Bring to Front', onClick: () => updateElementsLayer('front'), icon: <BringToFrontIcon /> },
      { label: 'Send to Back', onClick: () => updateElementsLayer('back'), icon: <SendToBackIcon /> },
      { label: 'Bring Forward', onClick: () => updateElementsLayer('forward'), icon: <BringForwardIcon />, disabled: selectedElementIds.length > 1 },
      { label: 'Send Backward', onClick: () => updateElementsLayer('backward'), icon: <SendBackwardIcon />, disabled: selectedElementIds.length > 1 }
    );
    
    showContextMenu(e, menuItems);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.hasAttribute('contenteditable'))) return;
      
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (isCtrlOrMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
            redo();
        } else {
            undo();
        }
      } else if (isCtrlOrMeta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if (selectedElementIds.length === 1 && isCtrlOrMeta) {
        switch (event.key.toLowerCase()) {
            case 'c': handleCopyElement(selectedElementIds[0]); event.preventDefault(); break;
            case 'x': handleCutElement(selectedElementIds[0]); event.preventDefault(); break;
        }
      } 
      
      if (isCtrlOrMeta) {
          if(event.key.toLowerCase() === 'v') {
              handlePasteElement(); event.preventDefault();
          }
      }
      
      if (selectedElementIds.length > 0 && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        deleteSelectedElements();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, slides, clipboard, handleCopyElement, handleCutElement, handlePasteElement, deleteSelectedElements, undo, redo]);

  const currentSlide = slides[currentSlideIndex];
  const selectedElements = currentSlide?.elements.filter(el => selectedElementIds.includes(el.id)) || [];

  return (
    <>
      <input
          type="file"
          ref={imageReplaceInputRef}
          onChange={handleReplaceImageFileChange}
          className="hidden"
          accept="image/png,image/jpeg,image/gif"
      />
      <input
          type="file"
          ref={iconReplaceInputRef}
          onChange={handleReplaceIconFileChange}
          className="hidden"
          accept="image/svg+xml"
      />
      <input
          type="file"
          ref={gifReplaceInputRef}
          onChange={handleReplaceGifFileChange}
          className="hidden"
          accept="image/gif"
      />
      {isPrinting ? (
        <PrintView slides={slides} onPrintFinished={() => setIsPrinting(false)} />
      ) : (
        <div id="main-app-view" className="h-screen w-screen flex flex-col font-sans antialiased text-gray-900 bg-slate-200" onClick={hideContextMenu}>
          {isPresenting && <PresentationView slides={slides} initialSlideIndex={currentSlideIndex} onExit={() => setIsPresenting(false)} />}
          
          <header className="bg-slate-800">
            <Ribbon 
                onNewSlide={handleNewSlide} onPresent={() => setIsPresenting(true)} onAddElement={addElement} onSetTheme={handleSetTheme}
                themes={themes} onToggleAIAssistant={() => setIsAIAssistantVisible(v => !v)} onToggleAnimationPane={() => setIsAnimationPaneVisible(v => !v)}
                onToggleImageSearch={() => setImageSearchContext({ isOpen: true, forReplaceId: null })}
                onToggleIconSearch={() => setIconSearchContext({ isOpen: true, forReplaceId: null })}
                onToggleGifSearch={() => setGifSearchContext({ isOpen: true, forReplaceId: null })}
                selectedElements={selectedElements} onUpdateElement={updateElement} onUpdateElements={updateElements}
                onGroupElements={handleGroupElements} onUngroupElements={handleUngroupElements}
                currentSlide={currentSlide} onUpdateSlide={updateCurrentSlide} canvasColor={canvasColor} onCanvasColorChange={setCanvasColor}
                onSaveApiKeys={handleSaveApiKeys} onExportToPptx={handleExportToPptx} onExportToPdf={handleExportToPdf} isExporting={isExporting} 
                onUpdateElementsLayer={updateElementsLayer} onAlignElements={alignElements}
                onApplyTransitionToAll={handleApplyTransitionToAll} onSetDrawingState={handleSetDrawingState}
                onOpenChartEditor={handleOpenChartEditor}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
            />
          </header>
          
          <main className="flex-1 grid grid-cols-[auto_1fr] overflow-hidden">
            <aside className="w-52 bg-gray-50 p-3 overflow-y-auto border-r border-gray-300">
              {slides.map((slide, index) => (
                <SlideThumbnail
                  key={slide.id} slide={slide} index={index} isActive={index === currentSlideIndex}
                  onClick={() => { setCurrentSlideIndex(index); setSelectedElementIds([]); }}
                  onDelete={() => deleteSlide(slide.id)} onDragStart={setDraggedSlideId}
                  onDrop={targetId => { if (draggedSlideId) handleReorderSlides(draggedSlideId, targetId); }}
                  onDragEnd={() => setDraggedSlideId(null)}
                  onContextMenu={(e) => handleSlideThumbnailContextMenu(e, slide.id)}
                />
              ))}
            </aside>

            <div className="flex-1 flex flex-col" style={{background: canvasColor}}>
              {currentSlide ? (
                <SlideEditor
                  key={currentSlide.id} slide={currentSlide} updateElements={updateElements} selectedElementIds={selectedElementIds}
                  onSelectElement={handleSelectElement} onSetSelection={handleSetSelection} drawingState={drawingState} onSetDrawingState={handleSetDrawingState}
                  onCanvasContextMenu={handleCanvasContextMenu} onElementContextMenu={handleElementContextMenu}
                />
              ) : (
                 <div className="flex-1 flex items-center justify-center"><p>Create a new slide to begin.</p></div>
              )}
              <footer className="h-8 bg-gray-200 border-t border-gray-300 flex items-center px-4 text-sm text-gray-600">
                Slide {currentSlideIndex + 1} of {slides.length}
              </footer>
            </div>
          </main>
          
          {contextMenu.isOpen && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={hideContextMenu} />}
          {isAIAssistantVisible && <AIAssistantPanel onAddElements={addElements} onGenerateFullPresentation={handleGenerateFullPresentation} onClose={() => setIsAIAssistantVisible(false)} onUpdateCurrentSlide={updateCurrentSlide} onCanvasColorChange={setCanvasColor} currentTheme={currentTheme} />}
          {isAnimationPaneVisible && currentSlide && <AnimationPane elements={currentSlide.elements} onClose={() => setIsAnimationPaneVisible(false)} onUpdateAnimation={(id, anim) => updateElement(id, { animation: anim })} onReorder={handleReorderAnimations} onRemoveAnimation={(id) => updateElement(id, { animation: undefined })} />}
          {imageSearchContext.isOpen && <ImageSearchModal onClose={() => setImageSearchContext({ isOpen: false, forReplaceId: null })} onSelectImage={handleSelectImageFromSearch} />}
          {iconSearchContext.isOpen && <IconSearchModal onClose={() => setIconSearchContext({ isOpen: false, forReplaceId: null })} onSelectIcon={handleSelectIconFromSearch} />}
          {gifSearchContext.isOpen && <GifSearchModal onClose={() => setGifSearchContext({ isOpen: false, forReplaceId: null })} onSelectGif={handleSelectGifFromSearch} />}
          {chartEditorContext.isOpen && (() => {
              const chartElement = slides[currentSlideIndex]?.elements.find(el => el.id === chartEditorContext.chartId && el.type === ElementType.CHART) as ChartElement | undefined;
              if (!chartElement) return null;
              return (
                  <ChartDataEditorModal
                      element={chartElement}
                      onClose={() => setChartEditorContext({ isOpen: false, chartId: null })}
                      onSave={handleSaveChartData}
                  />
              );
          })()}
        </div>
      )}
    </>
  );
};

export default App;
