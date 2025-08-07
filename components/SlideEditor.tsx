import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Slide, SlideElement, TextElement, ImageElement, ElementType, ShapeElement, ShapeType, VideoElement, AudioElement, IconElement, ThreeDModelElement, TableElement, SmartArtElement, ChartElement, AnimationEffect, BaseElement, GroupElement } from '../types';
import { DrawingState, DrawingTool } from '../App';
import ThreeDViewer from './ThreeDViewer';
import TableEditor from './TableEditor';
import SmartArtEditor from './SmartArtEditor';
import ChartViewer from './ChartViewer';

// Resizer handles component
const Resizer: React.FC<{ onResizeStart: (e: React.MouseEvent, direction: string) => void }> = ({ onResizeStart }) => {
    const directions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const cursorMap: { [key: string]: string } = {
        'top-left': 'nwse-resize',
        'top-right': 'nesw-resize',
        'bottom-left': 'nesw-resize',
        'bottom-right': 'nwse-resize',
    };
    return <>
        {directions.map(dir => (
            <div
                key={dir}
                onMouseDown={e => onResizeStart(e, dir)}
                className="w-3 h-3 bg-white border border-blue-500 absolute"
                style={{
                    cursor: cursorMap[dir],
                    top: dir.includes('top') ? '-6px' : undefined,
                    bottom: dir.includes('bottom') ? '-6px' : undefined,
                    left: dir.includes('left') ? '-6px' : undefined,
                    right: dir.includes('right') ? '-6px' : undefined,
                }}
            />
        ))}
    </>;
};

const getShapeClipPath = (shapeType: ShapeType): string => {
    switch (shapeType) {
        case ShapeType.RECTANGLE: return 'none';
        case ShapeType.OVAL: return 'ellipse(50% 50% at 50% 50%)';
        case ShapeType.TRIANGLE: return 'polygon(50% 0%, 0% 100%, 100% 100%)';
        case ShapeType.RIGHT_ARROW: return 'polygon(0% 25%, 50% 25%, 50% 0%, 100% 50%, 50% 100%, 50% 75%, 0% 75%)';
        case ShapeType.STAR_5: return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        default: return 'none';
    }
}


const getTextStyles = (el: TextElement): React.CSSProperties => {
    const style: React.CSSProperties = {};

    if (el.color && el.color.includes('gradient')) {
        style.background = el.color;
        style.WebkitBackgroundClip = 'text';
        style.backgroundClip = 'text';
        style.color = 'transparent';
    } else {
        style.color = el.color;
    }

    if (el.textShadow?.enabled) {
        const { offsetX, offsetY, blur, color } = el.textShadow;
        style.textShadow = `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    }
    if (el.textStroke?.enabled) {
        const { width, color } = el.textStroke;
        style.WebkitTextStroke = `${width}px ${color}`;
    }
    return style;
};

const StaticElementRenderer: React.FC<{ element: SlideElement }> = ({ element }) => {
    switch(element.type) {
        case ElementType.TITLE:
        case ElementType.SUBTITLE:
        case ElementType.CONTENT: {
            const textEl = element as TextElement;
            const dynamicStyles = getTextStyles(textEl);
            return <div style={{width:'100%',height:'100%',fontSize:`${textEl.fontSize}px`,fontWeight:textEl.fontWeight,fontStyle:textEl.fontStyle,textDecoration:textEl.textDecoration,textAlign:textEl.textAlign,fontFamily:textEl.fontFamily,...dynamicStyles}} dangerouslySetInnerHTML={{ __html: textEl.content }} />;
        }
        case ElementType.IMAGE: return <img src={(element as ImageElement).src} alt="" className="w-full h-full object-cover" style={{ filter: `brightness(${(element as ImageElement).filters.brightness}%) contrast(${(element as ImageElement).filters.contrast}%)`}} />;
        case ElementType.SHAPE: {
            const shapeEl = element as ShapeElement;
            const style: React.CSSProperties = {width:'100%',height:'100%',background:shapeEl.backgroundColor,clipPath:getShapeClipPath(shapeEl.shapeType)};
            if (shapeEl.borderWidth > 0) {
                style.borderStyle = 'solid';
                style.borderWidth = `${shapeEl.borderWidth}px`;
                if (shapeEl.borderColor.includes('gradient')) {
                    style.borderImageSource = shapeEl.borderColor;
                    style.borderImageSlice = 1;
                    style.borderColor = 'transparent';
                } else {
                    style.borderColor = shapeEl.borderColor;
                }
            }
            return <div style={style} />;
        }
        case ElementType.ICON: {
            const iconEl = element as IconElement;
            const color = iconEl.color.includes('gradient') ? (iconEl.color.match(/#(?:[0-9a-fA-F]{3,8})/)?.[0] || '#000000') : iconEl.color;
            const iconContainerStyle: React.CSSProperties = {width:'100%',height:'100%'};
            if (iconEl.color.includes('gradient')) {
                iconContainerStyle.background = iconEl.color;
                iconContainerStyle.maskImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconEl.svgString)}")`;
                iconContainerStyle.maskRepeat = 'no-repeat';
                iconContainerStyle.maskPosition = 'center';
                iconContainerStyle.maskSize = 'contain';
            }
            return (<div style={iconContainerStyle}>{!iconEl.color.includes('gradient') && (<div className="w-full h-full" style={{color:color}} dangerouslySetInnerHTML={{ __html: iconEl.svgString.replace(/<svg/g, `<svg fill="${color}" class="w-full h-full"`) }} />)}</div>);
        }
        // These can use their rich editors for static view too
        case ElementType.TABLE: return <TableEditor element={element as TableElement} onUpdate={()=>{}} />;
        case ElementType.SMART_ART: return <SmartArtEditor element={element as SmartArtElement} />;
        case ElementType.CHART: return <ChartViewer element={element as ChartElement} />;
        case ElementType.GROUP: return <> {(element as GroupElement).children.map(child => <div key={child.id} style={{position:'absolute',left:child.x,top:child.y,width:child.width,height:child.height,transform:`rotate(${child.rotation}deg)`}}><StaticElementRenderer element={child}/></div>)} </>;
        default: return <div className="w-full h-full bg-gray-200" />;
    }
};


// Main Editable Element
const EditableElement: React.FC<{
    element: SlideElement;
    updateElement: (id: string, props: Partial<SlideElement>) => void;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent, element: SlideElement) => void;
    onDoubleClick: (e: React.MouseEvent, element: SlideElement) => void;
    onContextMenu: (e: React.MouseEvent, elementId: string) => void;
    onResizeStart: (e: React.MouseEvent, element: SlideElement, direction: string) => void;
}> = ({ element, updateElement, isSelected, onMouseDown, onDoubleClick, onContextMenu, onResizeStart }) => {
    const [isEditing, setIsEditing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Start editing on double click
    const handleDoubleClickLocal = (e: React.MouseEvent) => {
        if(element.type === ElementType.CONTENT || element.type === ElementType.TITLE || element.type === ElementType.SUBTITLE) {
          setIsEditing(true);
        }
        onDoubleClick(e, element);
    };

    useEffect(() => {
        if (isEditing && contentRef.current) {
            contentRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
                range.selectNodeContents(contentRef.current);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [isEditing]);
    
    const handleTextBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const ribbon = document.getElementById('app-ribbon');
        if (ribbon && ribbon.contains(e.relatedTarget as Node)) {
            return; // Don't blur if focus moved to the ribbon
        }
        setIsEditing(false);
        if (element.type === ElementType.CONTENT || element.type === ElementType.TITLE || element.type === ElementType.SUBTITLE) {
          if (element.content !== e.currentTarget.innerHTML) {
            updateElement(element.id, { content: e.currentTarget.innerHTML });
          }
        }
    };
    
    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation}deg)`,
        outline: isSelected ? `2px solid ${isEditing ? '#f59e0b' : '#3b82f6'}` : 'none',
        outlineOffset: '2px',
        cursor: (element.type === ElementType.THREED_MODEL || isEditing) ? 'default' : 'move',
    };

    const renderContent = () => {
        switch(element.type) {
            case ElementType.TITLE:
            case ElementType.SUBTITLE:
            case ElementType.CONTENT: {
                const textEl = element as TextElement;
                const dynamicStyles = getTextStyles(textEl);
                return (
                    <div
                        ref={contentRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={handleTextBlur}
                        style={{
                            width: '100%', height: '100%',
                            fontSize: `${textEl.fontSize}px`,
                            fontWeight: textEl.fontWeight, fontStyle: textEl.fontStyle, textDecoration: textEl.textDecoration,
                            textAlign: textEl.textAlign, fontFamily: textEl.fontFamily,
                            cursor: isEditing ? 'text' : 'move', 
                            outline: 'none',
                            padding: '8px',
                            boxSizing: 'border-box',
                            ...dynamicStyles
                        }}
                        dangerouslySetInnerHTML={{ __html: textEl.content }}
                    />
                );
            }
            case ElementType.IMAGE: {
                const imgEl = element as ImageElement;
                return <img src={imgEl.src} alt="slide content" className="w-full h-full object-cover pointer-events-none" style={{ filter: `brightness(${imgEl.filters.brightness}%) contrast(${imgEl.filters.contrast}%)`}} />;
            }
            case ElementType.SHAPE: {
                const shapeEl = element as ShapeElement;
                const style: React.CSSProperties = {
                    width: '100%',
                    height: '100%',
                    background: shapeEl.backgroundColor,
                    clipPath: getShapeClipPath(shapeEl.shapeType),
                    pointerEvents: 'none'
                };
                 if (shapeEl.borderWidth > 0) {
                    style.borderStyle = 'solid';
                    style.borderWidth = `${shapeEl.borderWidth}px`;
                    if (shapeEl.borderColor.includes('gradient')) {
                        style.borderImageSource = shapeEl.borderColor;
                        style.borderImageSlice = 1;
                        style.borderColor = 'transparent';
                    } else {
                        style.borderColor = shapeEl.borderColor;
                    }
                }
                return <div style={style} />;
            }
            case ElementType.TABLE: {
                const tableEl = element as TableElement;
                return <TableEditor element={tableEl} onUpdate={(props) => updateElement(element.id, props)} />;
            }
            case ElementType.SMART_ART: {
                const smartArtEl = element as SmartArtElement;
                return <SmartArtEditor element={smartArtEl} onUpdate={(props) => updateElement(element.id, props)} />;
            }
            case ElementType.CHART: {
                const chartEl = element as ChartElement;
                return <ChartViewer element={chartEl} />;
            }
            case ElementType.VIDEO: {
                const videoEl = element as VideoElement;
                return <video src={videoEl.src} controls={videoEl.controls} loop={videoEl.autoplay} className="w-full h-full pointer-events-none" />;
            }
            case ElementType.AUDIO: {
                const audioEl = element as AudioElement;
                return <div className="w-full h-full flex items-center justify-center bg-gray-100 pointer-events-none"><audio src={audioEl.src} controls={audioEl.controls} loop={audioEl.autoplay} /></div>;
            }
            case ElementType.ICON: {
                const iconEl = element as IconElement;
                 const color = iconEl.color.includes('gradient')
                    ? (iconEl.color.match(/#(?:[0-9a-fA-F]{3,8})/)?.[0] || '#000000')
                    : iconEl.color;
                
                const iconContainerStyle: React.CSSProperties = {
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                };
                if (iconEl.color.includes('gradient')) {
                    iconContainerStyle.background = iconEl.color;
                    iconContainerStyle.maskImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconEl.svgString)}")`;
                    iconContainerStyle.maskRepeat = 'no-repeat';
                    iconContainerStyle.maskPosition = 'center';
                    iconContainerStyle.maskSize = 'contain';
                    iconContainerStyle.WebkitMaskImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconEl.svgString)}")`;
                    iconContainerStyle.WebkitMaskRepeat = 'no-repeat';
                    iconContainerStyle.WebkitMaskPosition = 'center';
                    iconContainerStyle.WebkitMaskSize = 'contain';
                }

                return (
                  <div style={iconContainerStyle}>
                    {!iconEl.color.includes('gradient') && (
                        <div className="w-full h-full" style={{ color: color }} dangerouslySetInnerHTML={{ __html: iconEl.svgString.replace(/<svg/g, `<svg fill="${color}" class="w-full h-full"`) }} />
                    )}
                  </div>
                );
            }
            case ElementType.THREED_MODEL: {
                const modelEl = element as ThreeDModelElement;
                return <ThreeDViewer src={modelEl.src} />;
            }
            case ElementType.GROUP: {
                const groupEl = element as GroupElement;
                return (
                    <div className="w-full h-full pointer-events-none relative">
                        {groupEl.children.map(child =>
                            <div key={child.id} style={{ position: 'absolute', left: child.x, top: child.y, width: child.width, height: child.height, transform: `rotate(${child.rotation}deg)`}}>
                                <StaticElementRenderer element={child}/>
                            </div>
                        )}
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div 
          style={baseStyle} 
          onMouseDown={(e) => onMouseDown(e, element)}
          onDoubleClick={handleDoubleClickLocal}
          onContextMenu={(e) => onContextMenu(e, element.id)}
        >
            {renderContent()}
            {isSelected && !isEditing && <Resizer onResizeStart={(e, dir) => onResizeStart(e, element, dir)} />}
        </div>
    );
};


// Slide Editor main component
interface SlideEditorProps {
  slide: Slide;
  updateElements: (updates: Array<{id: string, props: Partial<SlideElement>}>) => void;
  selectedElementIds: string[];
  onSelectElement: (id: string | null, isShiftKey: boolean) => void;
  onSetSelection: (ids: string[]) => void;
  drawingState: DrawingState;
  onSetDrawingState: (state: DrawingState) => void;
  onCanvasContextMenu: (e: React.MouseEvent) => void;
  onElementContextMenu: (e: React.MouseEvent, elementId: string) => void;
}

interface Guide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

const SlideEditor: React.FC<SlideEditorProps> = ({ slide, updateElements, selectedElementIds, onSelectElement, onSetSelection, drawingState, onSetDrawingState, onCanvasContextMenu, onElementContextMenu }) => {
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<{x: number, y: number} | null>(null);
  const [marquee, setMarquee] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  useLayoutEffect(() => {
    const slideContainer = slideContainerRef.current;
    const editorContainer = slideContainer?.parentElement?.parentElement;

    if (!slideContainer || !editorContainer) return;

    const updateScale = () => {
        const availableWidth = editorContainer.clientWidth - 64; // p-8 -> 4rem -> 64px padding
        const availableHeight = editorContainer.clientHeight - 64;
        const scaleX = availableWidth / 1280;
        const scaleY = availableHeight / 720;
        const scale = Math.min(scaleX, scaleY, 1);
        slideContainer.style.setProperty('--slide-scale', `${scale}`);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const calculateSnaps = (
    movingBounds: { left: number; right: number; top: number; bottom: number; hCenter: number; vCenter: number },
    allElements: SlideElement[],
    selectedIds: string[],
    scale: number
  ): { deltaX: number; deltaY: number; guides: Guide[] } => {
      const SNAP_THRESHOLD = 6 / scale;
      let deltaX = 0, deltaY = 0;
      const newGuides: Guide[] = [];

      const staticBounds = allElements
          .filter(el => !selectedIds.includes(el.id))
          .map(el => ({
              left: el.x, right: el.x + el.width, top: el.y, bottom: el.y + el.height,
              hCenter: el.x + el.width / 2, vCenter: el.y + el.height / 2
          }));

      const slideBounds = {
          left: 0, right: 1280, top: 0, bottom: 720,
          hCenter: 640, vCenter: 360
      };

      const allTargets = [...staticBounds, slideBounds];
      const { left, right, top, bottom, hCenter, vCenter } = movingBounds;

      for (const target of allTargets) {
          // Vertical Snaps
          if (Math.abs(left - target.left) < SNAP_THRESHOLD) { deltaX = target.left - left; newGuides.push({ type: 'vertical', position: target.left, start: Math.min(top, target.top), end: Math.max(bottom, target.bottom) }); }
          if (Math.abs(right - target.right) < SNAP_THRESHOLD) { deltaX = target.right - right; newGuides.push({ type: 'vertical', position: target.right, start: Math.min(top, target.top), end: Math.max(bottom, target.bottom) }); }
          if (Math.abs(hCenter - target.hCenter) < SNAP_THRESHOLD) { deltaX = target.hCenter - hCenter; newGuides.push({ type: 'vertical', position: target.hCenter, start: Math.min(top, target.top), end: Math.max(bottom, target.bottom) }); }
          if (Math.abs(left - target.right) < SNAP_THRESHOLD) { deltaX = target.right - left; newGuides.push({ type: 'vertical', position: target.right, start: Math.min(top, target.top), end: Math.max(bottom, target.bottom) }); }
          if (Math.abs(right - target.left) < SNAP_THRESHOLD) { deltaX = target.left - right; newGuides.push({ type: 'vertical', position: target.left, start: Math.min(top, target.top), end: Math.max(bottom, target.bottom) }); }

          // Horizontal Snaps
          if (Math.abs(top - target.top) < SNAP_THRESHOLD) { deltaY = target.top - top; newGuides.push({ type: 'horizontal', position: target.top, start: Math.min(left, target.left), end: Math.max(right, target.right) }); }
          if (Math.abs(bottom - target.bottom) < SNAP_THRESHOLD) { deltaY = target.bottom - bottom; newGuides.push({ type: 'horizontal', position: target.bottom, start: Math.min(left, target.left), end: Math.max(right, target.right) }); }
          if (Math.abs(vCenter - target.vCenter) < SNAP_THRESHOLD) { deltaY = target.vCenter - vCenter; newGuides.push({ type: 'horizontal', position: target.vCenter, start: Math.min(left, target.left), end: Math.max(right, target.right) }); }
          if (Math.abs(top - target.bottom) < SNAP_THRESHOLD) { deltaY = target.bottom - top; newGuides.push({ type: 'horizontal', position: target.bottom, start: Math.min(left, target.left), end: Math.max(right, target.right) }); }
          if (Math.abs(bottom - target.top) < SNAP_THRESHOLD) { deltaY = target.top - bottom; newGuides.push({ type: 'horizontal', position: target.top, start: Math.min(left, target.left), end: Math.max(right, target.right) }); }
      }
      return { deltaX, deltaY, guides: newGuides };
  };

  const handleResizeStart = (e: React.MouseEvent, element: SlideElement, direction: string) => {
      e.stopPropagation();
      e.preventDefault();
      const slideContainer = slideContainerRef.current;
      if (!slideContainer) return;
      const scale = parseFloat(getComputedStyle(slideContainer).getPropertyValue('--slide-scale') || '1');
      const startX = e.clientX;
      const startY = e.clientY;
      const { x, y, width, height } = element;

      const handleMouseMove = (moveEvent: MouseEvent) => {
          const dx = (moveEvent.clientX - startX) / scale;
          const dy = (moveEvent.clientY - startY) / scale;

          let newProps: Partial<SlideElement> = {};
          if (direction.includes('bottom')) newProps.height = height + dy;
          if (direction.includes('top')) { newProps.height = height - dy; newProps.y = y + dy; }
          if (direction.includes('right')) newProps.width = width + dx;
          if (direction.includes('left')) { newProps.width = width - dx; newProps.x = x + dx; }
          
          if (newProps.width && newProps.width < 20) newProps.width = 20;
          if (newProps.height && newProps.height < 20) newProps.height = 20;
          
          const currentBounds = { left: newProps.x ?? x, top: newProps.y ?? y, right: (newProps.x ?? x) + (newProps.width ?? width), bottom: (newProps.y ?? y) + (newProps.height ?? height), hCenter: (newProps.x ?? x) + (newProps.width ?? width)/2, vCenter: (newProps.y ?? y) + (newProps.height ?? height)/2 };
          const { deltaX, deltaY, guides } = calculateSnaps(currentBounds, slide.elements, selectedElementIds, scale);
          setGuides(guides);

          if (newProps.x !== undefined) newProps.x += deltaX;
          if (newProps.y !== undefined) newProps.y += deltaY;

          updateElements([{ id: element.id, props: newProps }]);
      };
      const handleMouseUp = () => {
          setGuides([]);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleElementMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation();
    const isSelected = selectedElementIds.includes(element.id);

    if (!(e.button === 2 && isSelected)) {
        if (e.shiftKey) {
            onSelectElement(element.id, true);
        } else if (!isSelected) {
            onSelectElement(element.id, false);
        }
    }
    
    const dragIds = isSelected ? selectedElementIds : [element.id];
    const dragElements = slide.elements.filter(el => dragIds.includes(el.id));
    if (dragElements.length === 0) return;

    const initialPositions = new Map(dragElements.map(el => [el.id, { x: el.x, y: el.y }]));

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const slideContainer = slideContainerRef.current;
        if (!slideContainer) return;
        const scale = parseFloat(getComputedStyle(slideContainer).getPropertyValue('--slide-scale') || '1');
        
        const dx = (moveEvent.clientX - e.clientX) / scale;
        const dy = (moveEvent.clientY - e.clientY) / scale;

        const minX = Math.min(...dragElements.map(el => (initialPositions.get(el.id)?.x ?? 0) + dx));
        const minY = Math.min(...dragElements.map(el => (initialPositions.get(el.id)?.y ?? 0) + dy));
        const maxX = Math.max(...dragElements.map(el => (initialPositions.get(el.id)?.x ?? 0) + dx + el.width));
        const maxY = Math.max(...dragElements.map(el => (initialPositions.get(el.id)?.y ?? 0) + dy + el.height));
        
        const selectionBounds = { left: minX, right: maxX, top: minY, bottom: maxY, hCenter: minX + (maxX-minX)/2, vCenter: minY + (maxY-minY)/2 };
        const { deltaX, deltaY, guides } = calculateSnaps(selectionBounds, slide.elements, dragIds, scale);
        setGuides(guides);

        const updates = dragElements.map(el => {
            const initialPos = initialPositions.get(el.id);
            if (!initialPos) return { id: el.id, props: {} };
            return {
                id: el.id,
                props: { x: initialPos.x + dx + deltaX, y: initialPos.y + dy + deltaY }
            };
        });

        if (updates.length > 0) updateElements(updates);
    };

    const handleMouseUp = () => {
        setGuides([]);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleElementDoubleClick = (e: React.MouseEvent, element: SlideElement) => {};

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingState.isActive && selectedElementIds.length > 0) {
        // Motion path drawing logic here...
    } else if (e.target === e.currentTarget) {
        if (!e.shiftKey) {
            onSelectElement(null, false);
        }

        const { left, top } = e.currentTarget.getBoundingClientRect();
        const scale = parseFloat(getComputedStyle(e.currentTarget).getPropertyValue('--slide-scale') || '1');
        const startX = (e.clientX - left) / scale;
        const startY = (e.clientY - top) / scale;

        setMarquee({ x: startX, y: startY, width: 0, height: 0 });

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const currentX = (moveEvent.clientX - left) / scale;
            const currentY = (moveEvent.clientY - top) / scale;
            setMarquee({
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY)
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            setMarquee(currentMarquee => {
                if (currentMarquee && (currentMarquee.width > 5 || currentMarquee.height > 5)) {
                    const selectedIds = slide.elements.filter(el => {
                        const el_x = el.x, el_y = el.y, el_w = el.width, el_h = el.height;
                        const mq_x = currentMarquee.x, mq_y = currentMarquee.y, mq_w = currentMarquee.width, mq_h = currentMarquee.height;
                        return el_x < mq_x + mq_w && el_x + el_w > mq_x && el_y < mq_y + mq_h && el_y + el_h > mq_y;
                    }).map(el => el.id);

                    if (upEvent.shiftKey) {
                        onSetSelection([...new Set([...selectedElementIds, ...selectedIds])]);
                    } else {
                        onSetSelection(selectedIds);
                    }
                }
                return null;
            });
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
  };
  
   const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (drawingState.tool === 'line' && lineStartPoint && slideContainerRef.current) {
            const { left, top } = slideContainerRef.current.getBoundingClientRect();
            const scale = parseFloat(getComputedStyle(slideContainerRef.current).getPropertyValue('--slide-scale') || '1');
            const moveX = (e.clientX - left) / scale;
            const moveY = (e.clientY - top) / scale;
            setPreviewPath(`M ${lineStartPoint.x} ${lineStartPoint.y} L ${moveX} ${moveY}`);
        }
    };

  const bgStyle: React.CSSProperties = {
    background: slide.backgroundColor,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    cursor: drawingState.isActive ? 'crosshair' : 'default',
  };

  if (slide.backgroundImage) {
      if (slide.backgroundImage.includes('gradient')) {
          bgStyle.background = slide.backgroundImage;
      } else {
          bgStyle.backgroundImage = `url(${slide.backgroundImage})`;
          bgStyle.backgroundColor = slide.backgroundColor;
      }
  }

  const firstSelectedElement = slide.elements.find(el => el.id === selectedElementIds[0]);
  const scale = slideContainerRef.current ? parseFloat(getComputedStyle(slideContainerRef.current).getPropertyValue('--slide-scale') || '1') : 1;

  return (
    <div className="flex-1 p-8 flex justify-center items-start overflow-auto" onContextMenu={(e) => { e.preventDefault(); onCanvasContextMenu(e); }}>
      <div className="flex-shrink-0 shadow-xl">
        <div
          ref={slideContainerRef}
          className="w-[1280px] h-[720px] bg-white relative transform origin-top"
          style={{...bgStyle, transform: 'scale(var(--slide-scale, 0.7))'}}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
        >
          {slide.elements.map(el => (
            <EditableElement
              key={el.id}
              element={el}
              updateElement={(id, props) => updateElements([{id, props}])}
              isSelected={selectedElementIds.includes(el.id)}
              onMouseDown={handleElementMouseDown}
              onDoubleClick={handleElementDoubleClick}
              onContextMenu={onElementContextMenu}
              onResizeStart={handleResizeStart}
            />
          ))}
          {marquee && (
              <div className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none" style={{
                  left: marquee.x,
                  top: marquee.y,
                  width: marquee.width,
                  height: marquee.height
              }} />
          )}
          {guides.map((guide, index) => {
              const style: React.CSSProperties = {
                  position: 'absolute',
                  backgroundColor: '#ef4444', // red-500
                  zIndex: 10000,
              };
              if (guide.type === 'horizontal') {
                  style.left = `${guide.start}px`;
                  style.top = `${guide.position}px`;
                  style.width = `${guide.end - guide.start}px`;
                  style.height = '1px';
              } else { // vertical
                  style.left = `${guide.position}px`;
                  style.top = `${guide.start}px`;
                  style.width = '1px';
                  style.height = `${guide.end - guide.start}px`;
              }
              return <div key={index} style={style} />;
          })}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 1280 720" style={{ zIndex: 9999 }}>
            {firstSelectedElement?.animation?.effect === AnimationEffect.MOTION_CUSTOM_PATH && firstSelectedElement.animation.path && (
                <path d={firstSelectedElement.animation.path} stroke="rgba(239, 68, 68, 0.8)" strokeWidth={2 / scale} fill="none" />
            )}
            {previewPath && (
                <path d={previewPath} stroke="rgba(0,0,0,0.5)" strokeWidth={2 / scale} fill="none" strokeDasharray={`${8 / scale} ${4 / scale}`} />
            )}
        </svg>
        </div>
      </div>
    </div>
  );
};

export default SlideEditor;