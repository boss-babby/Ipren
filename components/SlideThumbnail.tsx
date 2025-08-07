import React, { useState } from 'react';
import { Slide, SlideElement, ElementType, TextElement, ImageElement, ShapeElement, ShapeType, IconElement, VideoElement, AudioElement, ThreeDModelElement, TableElement, SmartArtElement, ChartElement, getTableThemeById } from '../types';
import { VideoIcon, AudioIcon, ThreeDIcon, TrashIcon, ChartIcon } from './icons';

const getShapePath = (shapeType: ShapeType): string => {
    switch(shapeType) {
        case ShapeType.RECTANGLE: return "M0,0 H100 V100 H0 Z";
        case ShapeType.TRIANGLE: return "M50,0 L100,100 L0,100 Z";
        case ShapeType.RIGHT_ARROW: return "M0,25 H50 V0 L100,50 L50,100 V75 H0 Z";
        case ShapeType.STAR_5: return "M50,0 L61.8,38.2 L100,38.2 L69.1,61.8 L80.9,100 L50,76.4 L19.1,100 L30.9,61.8 L0,38.2 L38.2,38.2 Z";
        default: return "M0,0 H100 V100 H0 Z";
    }
}

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

const getFirstColorFromGradient = (gradient: string): string => {
    if (!gradient || !gradient.includes('gradient')) return gradient;
    const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3,4})|rgba?\(.*\)/);
    return match ? match[0] : '#000000';
}

const renderElement = (el: SlideElement, scale: number) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${el.x * scale}px`,
        top: `${el.y * scale}px`,
        width: `${el.width * scale}px`,
        height: `${el.height * scale}px`,
        transform: `rotate(${el.rotation}deg)`,
        overflow: 'hidden',
    };

    switch(el.type) {
        case ElementType.TITLE:
        case ElementType.SUBTITLE:
        case ElementType.CONTENT: {
            const textEl = el as TextElement;
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = textEl.content;
            const plainText = tempDiv.textContent || tempDiv.innerText || "...";

            const textStyle: React.CSSProperties = {
                ...style,
                fontSize: `${textEl.fontSize * scale * 0.5}px`,
                fontWeight: textEl.fontWeight,
                fontStyle: textEl.fontStyle,
                textDecoration: textEl.textDecoration,
                textAlign: textEl.textAlign,
                color: getFirstColorFromGradient(textEl.color),
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
            };
            return <div key={el.id} style={textStyle}>{plainText}</div>
        }
        case ElementType.IMAGE: {
             const imgEl = el as ImageElement;
             const filterStyle = { filter: `brightness(${imgEl.filters.brightness}%) contrast(${imgEl.filters.contrast}%)` };
             return <img key={el.id} src={imgEl.src} style={{...style, ...filterStyle, objectFit: 'cover'}} alt="thumbnail element" />
        }
        case ElementType.SHAPE: {
            const shapeEl = el as ShapeElement;
            const shapeStyle: React.CSSProperties = {
                ...style,
                background: getFirstColorFromGradient(shapeEl.backgroundColor),
                clipPath: getShapeClipPath(shapeEl.shapeType)
            };
            return <div key={el.id} style={shapeStyle} />;
        }
        case ElementType.TABLE: {
            const tableEl = el as TableElement;
            const theme = getTableThemeById(tableEl.themeId);
            const headerColor = getFirstColorFromGradient(theme.headerBackground);
            return <div key={el.id} style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${tableEl.cols}, 1fr)`, gridTemplateRows: `repeat(${tableEl.rows}, 1fr)`, gap: `${1*scale}px`, border: `${1*scale}px solid ${headerColor}` }}>
                {Array.from({length: Math.min(25, tableEl.rows * tableEl.cols)}).map((_, i) => {
                    const isHeader = tableEl.headerRow && i < tableEl.cols;
                    const isBanded = tableEl.bandedRows && Math.floor(i / tableEl.cols) % 2 !== 0;
                    return <div key={i} style={{
                        background: isHeader ? headerColor : (isBanded ? theme.bandedRowBackground : 'transparent'),
                        opacity: isHeader ? 1 : 0.3
                    }}/>
                })}
            </div>
        }
        case ElementType.SMART_ART: {
             const smartArtEl = el as SmartArtElement;
             const bgColor = getFirstColorFromGradient(smartArtEl.nodeColor);
            return <div key={el.id} style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${4*scale}px` }}>
                {Array.from({length: 3}).map((_, i) => <div key={i} style={{width: `${15*scale}px`, height: `${15*scale}px`, borderRadius: '2px', backgroundColor: bgColor}}/>)}
            </div>
        }
        case ElementType.CHART: {
             return <div key={el.id} style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9e9e9' }}><ChartIcon /></div>
        }
        case ElementType.ICON: {
            const iconEl = el as IconElement;
            const color = getFirstColorFromGradient(iconEl.color);
            const iconHolderStyle: React.CSSProperties = { ...style, color };
            return <div key={el.id} style={iconHolderStyle} dangerouslySetInnerHTML={{ __html: iconEl.svgString.replace(/<svg/g, `<svg fill="${color}"`) }} />;
        }
        case ElementType.VIDEO:
        case ElementType.AUDIO:
        case ElementType.THREED_MODEL: {
            const Icon = el.type === ElementType.VIDEO ? VideoIcon : el.type === ElementType.AUDIO ? AudioIcon : ThreeDIcon;
            return <div key={el.id} style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}><Icon /></div>
        }
        default:
            return null;
    }
}

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
  onContextMenu: (event: React.MouseEvent, slideId: string) => void;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({ slide, index, isActive, onClick, onDelete, onDragStart, onDragEnd, onDrop, onContextMenu }) => {
  const thumbWidth = 144; // 9rem
  const slideWidth = 1280;
  const scale = thumbWidth / slideWidth;
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const bgStyle: React.CSSProperties = {
    background: slide.backgroundColor,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  if (slide.backgroundImage) {
      if (slide.backgroundImage.includes('gradient')) {
          bgStyle.background = slide.backgroundImage;
      } else {
          bgStyle.backgroundImage = `url(${slide.backgroundImage})`;
          bgStyle.backgroundColor = slide.backgroundColor;
      }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    onDrop(slide.id);
  };

  return (
    <div
      className="flex items-start space-x-3 mb-2 group relative"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', slide.id);
        onDragStart(slide.id);
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDraggedOver(true); }}
      onDragLeave={() => setIsDraggedOver(false)}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => onContextMenu(e, slide.id)}
    >
      {isDraggedOver && <div className="absolute top-[-2px] left-0 w-full h-1 bg-blue-500 z-20 rounded-full" />}
      <span className={`w-6 text-right text-sm ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>{index + 1}</span>
      <div className="relative">
        <button
            onClick={onClick}
            className={`w-36 h-[81px] ring-1 transition-all duration-150 ${isActive ? 'ring-2 ring-offset-2 ring-slate-700' : 'ring-gray-400 hover:ring-slate-600'}`}
        >
            <div className="w-full h-full bg-white relative overflow-hidden" style={bgStyle}>
                {slide.elements.map(el => renderElement(el, scale))}
            </div>
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-1 right-1 p-0.5 bg-white bg-opacity-75 rounded-full text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Delete Slide"
        >
            <TrashIcon />
        </button>
      </div>
    </div>
  );
};

export default SlideThumbnail;