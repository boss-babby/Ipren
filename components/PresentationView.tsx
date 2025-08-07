import React, { useEffect, useState, useMemo } from 'react';
import { Slide, SlideElement, TextElement, ImageElement, ShapeElement, ShapeType, ElementType, VideoElement, AudioElement, IconElement, ThreeDModelElement, TableElement, SmartArtElement, ChartElement, TransitionType, Animation, AnimationType, AnimationTrigger, AnimationEffect, getTableThemeById } from '../types';
import ThreeDViewer from './ThreeDViewer';
import SmartArtEditor from './SmartArtEditor';
import ChartViewer from './ChartViewer';

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

const getTextStyles = (el: TextElement, scale = 1): React.CSSProperties => {
    const style: React.CSSProperties = {
        fontSize: `${el.fontSize * scale}px`,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        textAlign: el.textAlign,
        fontFamily: el.fontFamily,
    };
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
        style.textShadow = `${offsetX*scale}px ${offsetY*scale}px ${blur*scale}px ${color}`;
    }
    if (el.textStroke?.enabled) {
        const { width, color } = el.textStroke;
        style.WebkitTextStroke = `${width*scale}px ${color}`;
    }
    return style;
};

const getFirstColorFromGradient = (gradient: string): string => {
    if (!gradient || !gradient.includes('gradient')) return gradient;
    const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3,4})|rgba?\(.*\)/);
    return match ? match[0] : '#000000';
}

const TableRenderer: React.FC<{ element: TableElement, scale: number }> = ({ element, scale }) => {
    const theme = getTableThemeById(element.themeId);

    const getCellStyle = (isHeader: boolean, rowIndex: number): React.CSSProperties => {
        const style: React.CSSProperties = { color: theme.cellColor, padding: `${8 * scale}px` };

        // Borders
        if (theme.id === 'minimal') {
            style.border = 'none';
            if (isHeader) {
                style.borderBottom = `${2 * scale}px solid ${getTableThemeById('gray').borderColor}`;
            }
        } else {
            style.border = `${1 * scale}px solid ${theme.borderColor}`;
        }
        
        // Background and text color
        if (isHeader && element.headerRow) {
            style.backgroundColor = theme.headerBackground;
            style.color = theme.headerColor;
            style.fontWeight = 'bold';
        } else if (element.bandedRows && (element.headerRow ? (rowIndex-1) : rowIndex) % 2 !== 0) {
            style.backgroundColor = theme.bandedRowBackground;
        }
        
        return style;
    }
    
    return (
        <table className="w-full h-full border-collapse" style={{fontSize: `${20 * scale}px`}}>
            <tbody>
                {element.cellData.map((row, rIdx) => (
                    <tr key={rIdx}>
                        {row.map((cell, cIdx) => {
                            const isHeader = element.headerRow && rIdx === 0;
                            return (
                                <td key={cIdx} style={getCellStyle(isHeader, rIdx)} className="align-top" dangerouslySetInnerHTML={{ __html: cell }} />
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

interface AnimationSequenceItem {
    id: string;
    click: number;
    animation: Animation;
}

interface AnimationSequencer {
    sequence: AnimationSequenceItem[];
    totalClicks: number;
}

export const SlideRenderer: React.FC<{ 
    slide: Slide; 
    scale: number;
    isStatic: boolean;
    animationStep?: number;
    animationSequencer?: AnimationSequencer;
}> = ({ slide, scale, isStatic, animationStep = 0, animationSequencer = { sequence: [], totalClicks: 0 } }) => {

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

    const renderElement = (el: SlideElement) => {
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: isStatic ? `${el.x}px` : `${(el.x / 1280) * 100}%`,
            top: isStatic ? `${el.y}px` : `${(el.y / 720) * 100}%`,
            width: isStatic ? `${el.width}px` : `${(el.width / 1280) * 100}%`,
            height: isStatic ? `${el.height}px` : `${(el.height / 720) * 100}%`,
            rotate: `${el.rotation}deg`,
        };

        if (!isStatic) {
            baseStyle.willChange = 'opacity, transform, translate, rotate, scale, offset-path';
            
            const animInfo = animationSequencer.sequence.find(s => s.id === el.id);
            let finalTranslate = '0 0';
            let offsetPath: string | undefined = undefined;
            let offsetAnchor: string | undefined = undefined;

            if (animInfo && animInfo.click < animationStep && animInfo.animation.type === AnimationType.MOTION) {
                if (animInfo.animation.effect === AnimationEffect.MOTION_CUSTOM_PATH && animInfo.animation.path) {
                    offsetPath = `path('${animInfo.animation.path}')`;
                    offsetAnchor = '50% 50%';
                     baseStyle.animationName = 'motion-custom-path-anim';
                     baseStyle.animationDuration = `1ms`; // Keep it at the end
                     baseStyle.animationFillMode = 'forwards';
                } else {
                    switch(animInfo.animation.effect) {
                        case AnimationEffect.MOTION_LINE_RIGHT: finalTranslate = '150px 0'; break;
                        case AnimationEffect.MOTION_LINE_DOWN: finalTranslate = '0 150px'; break;
                        case AnimationEffect.MOTION_DIAGONAL_DOWN_RIGHT: finalTranslate = '150px 150px'; break;
                    }
                }
            }
            
            baseStyle.translate = finalTranslate;
            baseStyle.offsetPath = offsetPath;
            baseStyle.offsetAnchor = offsetAnchor;

            if (animInfo) {
                const isUpcoming = animInfo.click > animationStep;
                const isActive = animInfo.click === animationStep;
                const isFinished = animInfo.click < animationStep;

                if (isUpcoming && animInfo.animation.type === AnimationType.ENTRANCE) {
                    baseStyle.opacity = 0;
                }
                if (isFinished && animInfo.animation.type === AnimationType.EXIT) {
                    baseStyle.opacity = 0;
                }
                if (isActive) {
                    baseStyle.animationName = `${animInfo.animation.effect.toLowerCase().replace(/_/g, '-')}-anim`;
                    baseStyle.animationDuration = `${animInfo.animation.duration}ms`;
                    baseStyle.animationDelay = `${animInfo.animation.delay}ms`;
                    baseStyle.animationFillMode = 'forwards';
                    baseStyle.animationTimingFunction = 'ease-in-out';
                     if (animInfo.animation.type === AnimationType.ENTRANCE) {
                        baseStyle.opacity = 0;
                    }
                    if (animInfo.animation.effect === AnimationEffect.MOTION_CUSTOM_PATH && animInfo.animation.path) {
                        baseStyle.offsetPath = `path('${animInfo.animation.path}')`;
                        baseStyle.offsetAnchor = '50% 50%';
                    }
                }
            }
        }
        
        switch (el.type) {
          case ElementType.TITLE:
          case ElementType.SUBTITLE:
          case ElementType.CONTENT: {
            const textEl = el as TextElement;
            const dynamicStyles = getTextStyles(textEl, scale);
            return (
              <div
                key={textEl.id}
                style={{
                    ...baseStyle,
                    ...dynamicStyles,
                    padding: `${8 * scale}px`,
                    boxSizing: 'border-box',
                }}
                dangerouslySetInnerHTML={{ __html: textEl.content }}
              />
            );
          }
          case ElementType.IMAGE: {
            const imgEl = el as ImageElement;
            const imageStyles: React.CSSProperties = {
                filter: `brightness(${imgEl.filters.brightness}%) contrast(${imgEl.filters.contrast}%)`,
            };

            if (isStatic) {
                // For printing, use an <img> tag so we can wait for it to load.
                return (
                    <img
                        key={imgEl.id}
                        src={imgEl.src}
                        style={{ ...baseStyle, ...imageStyles, objectFit: 'cover' }}
                        alt=""
                    />
                );
            }
            
            // For live presentation, the div with background image is fine.
            return <div key={imgEl.id} style={{
                ...baseStyle,
                ...imageStyles,
                backgroundImage: `url(${imgEl.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }} />;
          }
          case ElementType.SHAPE: {
            const shapeEl = el as ShapeElement;
            const shapeStyle: React.CSSProperties = { 
                ...baseStyle, 
                background: shapeEl.backgroundColor,
                clipPath: getShapeClipPath(shapeEl.shapeType),
            };
            if (shapeEl.borderWidth > 0) {
                shapeStyle.borderStyle = 'solid';
                shapeStyle.borderWidth = `${shapeEl.borderWidth * scale}px`;
                 if (shapeEl.borderColor.includes('gradient')) {
                    shapeStyle.borderImageSource = shapeEl.borderColor;
                    shapeStyle.borderImageSlice = 1;
                    shapeStyle.borderColor = 'transparent';
                } else {
                    shapeStyle.borderColor = shapeEl.borderColor;
                }
            }
            return <div key={shapeEl.id} style={shapeStyle} />;
          }
          case ElementType.TABLE: {
              const tableEl = el as TableElement;
              return <div key={tableEl.id} style={baseStyle}><TableRenderer element={tableEl} scale={scale}/></div>;
          }
          case ElementType.SMART_ART: {
              const smartArtEl = el as SmartArtElement;
              return <div key={smartArtEl.id} style={baseStyle}><SmartArtEditor element={smartArtEl} /></div>;
          }
          case ElementType.CHART: {
              const chartEl = el as ChartElement;
              return <div key={chartEl.id} style={baseStyle}><ChartViewer element={chartEl} /></div>;
          }
          case ElementType.VIDEO: {
              const videoEl = el as VideoElement;
              return <div key={videoEl.id} style={baseStyle}><video src={videoEl.src} autoPlay={!isStatic && videoEl.autoplay} controls={videoEl.controls} className="w-full h-full" /></div>
          }
          case ElementType.AUDIO: {
              const audioEl = el as AudioElement;
              return <div key={audioEl.id} style={audioEl.controls ? baseStyle : {}}><audio src={audioEl.src} autoPlay={!isStatic && audioEl.autoplay} controls={audioEl.controls} /></div>
          }
           case ElementType.ICON: {
                const iconEl = el as IconElement;
                const color = getFirstColorFromGradient(iconEl.color);
                const iconContainerStyle: React.CSSProperties = {...baseStyle};
    
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
                    <div key={iconEl.id} style={iconContainerStyle}>
                        {!iconEl.color.includes('gradient') && (
                            <div className="w-full h-full" style={{ color: color }} dangerouslySetInnerHTML={{ __html: iconEl.svgString.replace(/<svg/g, `<svg fill="${color}" class="w-full h-full"`) }} />
                        )}
                    </div>
                );
            }
          case ElementType.THREED_MODEL: {
              const modelEl = el as ThreeDModelElement;
              return <div key={modelEl.id} style={baseStyle}><ThreeDViewer src={modelEl.src} /></div>;
          }
          default:
            return null;
        }
    };
    
    return (
        <div className="w-full h-full relative" style={bgStyle}>
            {slide.elements.map(renderElement)}
        </div>
    );
};


const PresentationView: React.FC<{ slides: Slide[]; initialSlideIndex: number; onExit: () => void; }> = ({ slides, initialSlideIndex, onExit }) => {
    const [viewState, setViewState] = useState({
        current: initialSlideIndex,
        previous: -1,
        direction: 'forward' as 'forward' | 'backward',
        isTransitioning: false
    });
    const [animationStep, setAnimationStep] = useState(0);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    
    const currentSlide = slides[viewState.current];

    const animationSequencer = useMemo((): AnimationSequencer => {
        if (!currentSlide) return { sequence: [], totalClicks: 0 };
        const sequence: AnimationSequenceItem[] = [];
        let clickCount = 0;
        for (const el of currentSlide.elements) {
            if (el.animation) {
                if (el.animation.trigger === AnimationTrigger.ON_CLICK) {
                    clickCount++;
                }
                sequence.push({ id: el.id, click: clickCount, animation: el.animation });
            }
        }
        return { sequence, totalClicks: clickCount };
    }, [currentSlide]);

    useEffect(() => {
        setAnimationStep(0);
    }, [viewState.current]);


    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        
        const handleKeyDown = (e: KeyboardEvent) => {
          if (viewState.isTransitioning) return;

          let newIndex = viewState.current;
          let newDirection: 'forward' | 'backward' = 'forward';
          let shouldChangeSlide = false;
  
          if (e.key === 'ArrowRight' || e.key === ' ') {
              e.preventDefault();
              if (animationStep < animationSequencer.totalClicks) {
                  setAnimationStep(s => s + 1);
              } else if (viewState.current < slides.length - 1) {
                  newIndex++;
                  newDirection = 'forward';
                  shouldChangeSlide = true;
              }
          } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              if (animationStep > 0) {
                  setAnimationStep(s => s - 1);
              } else if (viewState.current > 0) {
                  newIndex--;
                  newDirection = 'backward';
                  shouldChangeSlide = true;
              }
          } else if (e.key === 'Escape') {
              onExit();
          }

          if (shouldChangeSlide) {
            const transition = slides[newIndex]?.transition;
            if (!transition || transition.type === TransitionType.NONE) {
                setViewState(vs => ({ ...vs, current: newIndex, previous: -1 }));
                return;
            }
            setViewState({ current: newIndex, previous: viewState.current, direction: newDirection, isTransitioning: true });
            setTimeout(() => {
                setViewState(vs => ({ ...vs, previous: -1, isTransitioning: false }));
            }, transition.duration);
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('resize', handleResize);
        };
    }, [slides, onExit, viewState, animationStep, animationSequencer.totalClicks]);

    const aspect = 16 / 9;
    const screenAspect = dimensions.width / dimensions.height;
    let scale = 1;
    let scaledWidth = '100vw';
    let scaledHeight = '100vh';

    if (screenAspect > aspect) {
        scaledWidth = `${dimensions.height * aspect}px`;
        scale = (dimensions.height * aspect) / 1280;
    } else {
        scaledHeight = `${dimensions.width / aspect}px`;
        scale = dimensions.width / 1280;
    }

    const previousSlide = viewState.previous > -1 ? slides[viewState.previous] : null;
    const transition = currentSlide?.transition;

    const getAnimationName = (isExit: boolean): string => {
        if (!viewState.isTransitioning || !transition) return 'none';
        
        const type = transition.type.toLowerCase();
        const dir = viewState.direction;
        const state = isExit ? 'exit' : 'enter';
        
        if (type === 'fade') return isExit ? 'fade-out' : 'fade-in';
        if (type === 'morph') return isExit ? 'morph-exit' : 'morph-enter';
        if (type === 'push') return `push-${state}-${dir}`;
        if (type === 'wipe') return isExit ? 'none' : `wipe-enter-${dir}`;
        if (type === 'zoom') {
            if (dir === 'forward') return isExit ? 'zoom-in-exit' : 'zoom-in-enter';
            return isExit ? 'zoom-out-exit' : 'zoom-out-enter';
        }
        return 'none';
    };

    return (
        <div className="presenter-view-host">
            <div className="presenter-view-container" style={{ width: scaledWidth, height: scaledHeight }}>
                {currentSlide && (
                    <div 
                        className="slide-wrapper" 
                        style={{ animation: `${getAnimationName(false)} ${transition?.duration || 0}ms ease-in-out forwards` }}
                    >
                        <SlideRenderer slide={currentSlide} scale={scale} isStatic={false} animationStep={animationStep} animationSequencer={animationSequencer} />
                    </div>
                )}
                {previousSlide && viewState.isTransitioning && (
                    <div 
                        className="slide-wrapper" 
                        style={{ animation: `${getAnimationName(true)} ${transition?.duration || 0}ms ease-in-out forwards` }}
                    >
                        <SlideRenderer slide={previousSlide} scale={scale} isStatic={true} />
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 text-white flex justify-between items-center">
                <span>Slide {viewState.current + 1} of {slides.length}</span>
                <button onClick={onExit} className="px-3 py-1 bg-red-600 rounded hover:bg-red-700">Exit (Esc)</button>
            </div>
        </div>
    );
};

export default PresentationView;