import React, { useState, useEffect } from 'react';
import { SlideElement, TextElement, ImageElement, ShapeElement, ElementType, VideoElement, AudioElement, IconElement, TableElement, SmartArtElement, ChartElement, GroupElement, tableThemes } from '../types';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, BulletListIcon, NumberedListIcon, AlignTopIcon, AlignMiddleVerticalIcon, AlignBottomIcon, BringForwardIcon, SendBackwardIcon, BringToFrontIcon, SendToBackIcon, GroupIcon, UngroupIcon, EditDataIcon } from './icons';
import ColorPicker from './ColorPicker';

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Impact', 'Montserrat'];

const RibbonGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-1 border-r border-gray-300 h-full flex flex-col justify-between items-center">
        <div className="flex items-center space-x-1">
            {children}
        </div>
        <p className="text-xs text-center text-gray-600 mt-1">{title}</p>
    </div>
);

const LabelledInput: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col items-center space-y-1">
        {children}
        <label className="text-xs text-gray-600">{label}</label>
    </div>
);

const ToggleButton: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    onMouseDown?: (e: React.MouseEvent) => void;
    disabled?: boolean;
}> = ({ onClick, onMouseDown, isActive, title, children, disabled }) => (
    <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        title={title}
        disabled={disabled}
        className={`p-2 rounded ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

const TextFormatToolbar: React.FC<{ element: TextElement; onUpdateElement: (id: string, props: Partial<TextElement>) => void }> = ({ element, onUpdateElement }) => {
  const handleUpdate = (props: Partial<TextElement>) => onUpdateElement(element.id, props);
  const handleCommand = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false);
  };

  return (
    <>
      <RibbonGroup title="Font">
        <select aria-label="Font Family" value={element.fontFamily} onChange={(e) => handleUpdate({ fontFamily: e.target.value })} className="h-8 px-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36">
            {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
        <input type="number" aria-label="Font Size" value={element.fontSize} onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value, 10) || 1 })} className="w-20 h-8 px-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <ColorPicker value={element.color} onChange={(color) => handleUpdate({ color })} />
      </RibbonGroup>

      <RibbonGroup title="Paragraph">
        <ToggleButton onMouseDown={(e) => handleCommand(e, 'bold')} onClick={() => {}} title="Bold"><BoldIcon /></ToggleButton>
        <ToggleButton onMouseDown={(e) => handleCommand(e, 'italic')} onClick={() => {}} title="Italic"><ItalicIcon /></ToggleButton>
        <ToggleButton onMouseDown={(e) => handleCommand(e, 'underline')} onClick={() => {}} title="Underline"><UnderlineIcon /></ToggleButton>
        <div className="border-l h-6 mx-1"></div>
        <ToggleButton onClick={() => handleUpdate({ textAlign: 'left' })} isActive={element.textAlign === 'left'} title="Align Left"><AlignLeftIcon /></ToggleButton>
        <ToggleButton onClick={() => handleUpdate({ textAlign: 'center' })} isActive={element.textAlign === 'center'} title="Align Center"><AlignCenterIcon /></ToggleButton>
        <ToggleButton onClick={() => handleUpdate({ textAlign: 'right' })} isActive={element.textAlign === 'right'} title="Align Right"><AlignRightIcon /></ToggleButton>
        <div className="border-l h-6 mx-1"></div>
        <ToggleButton onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')} onClick={() => {}} title="Bulleted List"><BulletListIcon /></ToggleButton>
        <ToggleButton onMouseDown={(e) => handleCommand(e, 'insertOrderedList')} onClick={() => {}} title="Numbered List"><NumberedListIcon /></ToggleButton>
      </RibbonGroup>
       <RibbonGroup title="Text Effects">
            <LabelledInput label="Shadow">
                <input type="checkbox" checked={element.textShadow?.enabled ?? false} onChange={e => handleUpdate({ textShadow: { ...(element.textShadow || { offsetX: 2, offsetY: 2, blur: 4, color: '#00000080' }), enabled: e.target.checked } })} className="w-4 h-4" />
            </LabelledInput>
            <ColorPicker value={element.textShadow?.color || '#00000080'} onChange={color => handleUpdate({ textShadow: { ...element.textShadow!, color: color }})} disabled={!element.textShadow?.enabled} />
            <LabelledInput label="Stroke">
                <input type="checkbox" checked={element.textStroke?.enabled ?? false} onChange={e => handleUpdate({ textStroke: { ...(element.textStroke || { width: 1, color: '#000000' }), enabled: e.target.checked } })} className="w-4 h-4" />
            </LabelledInput>
            <ColorPicker value={element.textStroke?.color || '#000000'} onChange={color => handleUpdate({ textStroke: { ...element.textStroke!, color: color }})} disabled={!element.textStroke?.enabled} />
        </RibbonGroup>
    </>
  );
};

const ShapeFormatToolbar: React.FC<{ element: ShapeElement; onUpdateElement: (id: string, props: Partial<ShapeElement>) => void }> = ({ element, onUpdateElement }) => (
    <RibbonGroup title="Shape Styles">
        <LabelledInput label="Fill">
             <ColorPicker value={element.backgroundColor} onChange={color => onUpdateElement(element.id, { backgroundColor: color })} />
        </LabelledInput>
        <LabelledInput label="Border">
             <ColorPicker value={element.borderColor} onChange={color => onUpdateElement(element.id, { borderColor: color })} />
        </LabelledInput>
        <LabelledInput label="Width">
            <input type="number" min="0" max="50" value={element.borderWidth} onChange={e => onUpdateElement(element.id, { borderWidth: parseInt(e.target.value) })} className="w-16 p-1 border border-gray-300 rounded text-sm"/>
        </LabelledInput>
    </RibbonGroup>
);

const ImageFormatToolbar: React.FC<{ element: ImageElement; onUpdateElement: (id: string, props: Partial<ImageElement>) => void }> = ({ element, onUpdateElement }) => {
    const handleFilterChange = (filter: 'brightness' | 'contrast', value: number) => {
        onUpdateElement(element.id, { filters: { ...element.filters, [filter]: value } });
    };
    return (
        <RibbonGroup title="Adjust">
            <LabelledInput label="Brightness">
                <input type="range" min="0" max="200" value={element.filters.brightness} onChange={e => handleFilterChange('brightness', parseInt(e.target.value))} className="w-24" />
            </LabelledInput>
             <LabelledInput label="Contrast">
                <input type="range" min="0" max="200" value={element.filters.contrast} onChange={e => handleFilterChange('contrast', parseInt(e.target.value))} className="w-24" />
            </LabelledInput>
        </RibbonGroup>
    );
};

const VideoAudioFormatToolbar: React.FC<{ element: VideoElement | AudioElement; onUpdateElement: (id: string, props: Partial<VideoElement | AudioElement>) => void }> = ({ element, onUpdateElement }) => (
    <RibbonGroup title="Playback Options">
        <LabelledInput label="Autoplay">
            <input type="checkbox" checked={element.autoplay} onChange={e => onUpdateElement(element.id, { autoplay: e.target.checked })} className="w-5 h-5" />
        </LabelledInput>
        <LabelledInput label="Controls">
            <input type="checkbox" checked={element.controls} onChange={e => onUpdateElement(element.id, { controls: e.target.checked })} className="w-5 h-5" />
        </LabelledInput>
    </RibbonGroup>
);

const IconFormatToolbar: React.FC<{ element: IconElement; onUpdateElement: (id: string, props: Partial<IconElement>) => void }> = ({ element, onUpdateElement }) => (
    <RibbonGroup title="Icon Style">
        <LabelledInput label="Color">
            <ColorPicker value={element.color} onChange={color => onUpdateElement(element.id, { color: color })} />
        </LabelledInput>
    </RibbonGroup>
);

const TableFormatToolbar: React.FC<{ element: TableElement; onUpdateElement: (id: string, props: Partial<TableElement>) => void }> = ({ element, onUpdateElement }) => (
    <>
        <RibbonGroup title="Table Styles">
            <div className="grid grid-cols-3 gap-1">
                {tableThemes.map(theme => {
                    const isSelected = element.themeId === theme.id;
                    return (
                        <button
                            key={theme.id}
                            title={theme.name}
                            onClick={() => onUpdateElement(element.id, { themeId: theme.id })}
                            className={`w-10 h-8 rounded border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}`}
                        >
                            <div className="w-full h-full p-0.5">
                                <div className="h-1/3 w-full" style={{ backgroundColor: theme.headerBackground }}></div>
                                <div className="h-1/3 w-full" style={{ backgroundColor: '#FFFFFF' }}></div>
                                <div className="h-1/3 w-full" style={{ backgroundColor: theme.bandedRowBackground }}></div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </RibbonGroup>
        <RibbonGroup title="Table Options">
            <LabelledInput label="Header Row">
                <input type="checkbox" checked={element.headerRow} onChange={e => onUpdateElement(element.id, { headerRow: e.target.checked })} className="w-5 h-5" />
            </LabelledInput>
            <LabelledInput label="Banded Rows">
                <input type="checkbox" checked={element.bandedRows} onChange={e => onUpdateElement(element.id, { bandedRows: e.target.checked })} className="w-5 h-5" />
            </LabelledInput>
        </RibbonGroup>
         <RibbonGroup title="Text Formatting">
            <ToggleButton onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} onClick={() => {}} title="Bold"><BoldIcon /></ToggleButton>
            <ToggleButton onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} onClick={() => {}} title="Italic"><ItalicIcon /></ToggleButton>
            <ToggleButton onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }} onClick={() => {}} title="Underline"><UnderlineIcon /></ToggleButton>
            <div className="border-l h-6 mx-1"></div>
            <ColorPicker
                value={'#000000'}
                onChange={color => document.execCommand('foreColor', false, color)}
                onMouseDown={e => e.preventDefault()}
            />
        </RibbonGroup>
    </>
);

const SmartArtFormatToolbar: React.FC<{ element: SmartArtElement; onUpdateElement: (id: string, props: Partial<SmartArtElement>) => void }> = ({ element, onUpdateElement }) => (
    <RibbonGroup title="SmartArt Style">
        <LabelledInput label="Node Color">
            <ColorPicker value={element.nodeColor} onChange={color => onUpdateElement(element.id, { nodeColor: color })} />
        </LabelledInput>
        <LabelledInput label="Line Color">
            <ColorPicker value={element.lineColor} onChange={color => onUpdateElement(element.id, { lineColor: color })} />
        </LabelledInput>
    </RibbonGroup>
);

const ChartFormatToolbar: React.FC<{ element: ChartElement; onUpdateElement: (id: string, props: Partial<ChartElement>) => void; onOpenChartEditor: (chartId: string) => void; }> = ({ element, onUpdateElement, onOpenChartEditor }) => {

    const handleConfigChange = (props: Partial<ChartElement['config']>) => {
        onUpdateElement(element.id, { config: { ...element.config, ...props } });
    };

    return (
        <>
            <RibbonGroup title="Chart Data">
                 <button 
                    onClick={() => onOpenChartEditor(element.id)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 font-medium"
                >
                    <EditDataIcon />
                    <span>Edit Data...</span>
                </button>
            </RibbonGroup>
            <RibbonGroup title="Chart Options">
                 <LabelledInput label="Legend">
                    <input
                        type="checkbox"
                        checked={element.config.showLegend}
                        onChange={e => handleConfigChange({ showLegend: e.target.checked })}
                        className="w-4 h-4"
                    />
                </LabelledInput>
                <LabelledInput label="Grid">
                    <input
                        type="checkbox"
                        checked={element.config.showGrid}
                        onChange={e => handleConfigChange({ showGrid: e.target.checked })}
                        className="w-4 h-4"
                    />
                </LabelledInput>
            </RibbonGroup>
            <RibbonGroup title="Chart Colors">
                {element.config.colors.slice(0, 4).map((color, index) => (
                    <LabelledInput key={index} label={`C${index + 1}`}>
                        <ColorPicker
                            value={color}
                            onChange={newColor => {
                                const newColors = [...element.config.colors];
                                newColors[index] = newColor;
                                handleConfigChange({ colors: newColors });
                            }}
                        />
                    </LabelledInput>
                ))}
            </RibbonGroup>
        </>
    );
};


interface FormatToolbarProps {
  selectedElements: SlideElement[];
  onUpdateElement: (elementId: string, props: Partial<SlideElement>) => void;
  onUpdateElements: (updates: Array<{id: string, props: Partial<SlideElement>}>) => void;
  onUpdateElementsLayer: (direction: 'front' | 'back' | 'forward' | 'backward') => void;
  onAlignElements: (alignment: 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right') => void;
  onGroupElements: () => void;
  onUngroupElements: () => void;
  onOpenChartEditor: (chartId: string) => void;
}

const FormatToolbar: React.FC<FormatToolbarProps> = ({ selectedElements, onUpdateElement, onUpdateElements, onUpdateElementsLayer, onAlignElements, onGroupElements, onUngroupElements, onOpenChartEditor }) => {
    
    const renderElementSpecificToolbar = () => {
        if (selectedElements.length !== 1) return null;
        const element = selectedElements[0];
        
        switch(element.type) {
            case ElementType.TITLE:
            case ElementType.SUBTITLE:
            case ElementType.CONTENT:
                return <TextFormatToolbar element={element as TextElement} onUpdateElement={onUpdateElement} />;
            case ElementType.SHAPE:
                return <ShapeFormatToolbar element={element as ShapeElement} onUpdateElement={onUpdateElement} />;
            case ElementType.IMAGE:
                return <ImageFormatToolbar element={element as ImageElement} onUpdateElement={onUpdateElement} />;
            case ElementType.VIDEO:
            case ElementType.AUDIO:
                return <VideoAudioFormatToolbar element={element as VideoElement | AudioElement} onUpdateElement={onUpdateElement} />;
            case ElementType.ICON:
                return <IconFormatToolbar element={element as IconElement} onUpdateElement={onUpdateElement} />;
            case ElementType.TABLE:
                return <TableFormatToolbar element={element as TableElement} onUpdateElement={onUpdateElement} />;
            case ElementType.SMART_ART:
                return <SmartArtFormatToolbar element={element as SmartArtElement} onUpdateElement={onUpdateElement} />;
            case ElementType.CHART:
                return <ChartFormatToolbar element={element as ChartElement} onUpdateElement={onUpdateElement} onOpenChartEditor={onOpenChartEditor} />;
            case ElementType.THREED_MODEL:
                return <RibbonGroup title="3D Model"><p className="text-sm text-gray-500">Rotate with mouse</p></RibbonGroup>;
            case ElementType.GROUP:
                return <RibbonGroup title="Group"><p className="text-sm text-gray-500">Edit group properties</p></RibbonGroup>;
            default:
                return null;
        }
    };
    
    const isMultiSelect = selectedElements.length > 1;
    const isGroupSelected = selectedElements.length === 1 && selectedElements[0].type === ElementType.GROUP;

    return (
        <div className="flex space-x-1 h-full">
            {renderElementSpecificToolbar()}

            <RibbonGroup title="Align">
                <ToggleButton onClick={() => onAlignElements('left')} title="Align Left"><AlignLeftIcon /></ToggleButton>
                <ToggleButton onClick={() => onAlignElements('center')} title="Align Center"><AlignCenterIcon /></ToggleButton>
                <ToggleButton onClick={() => onAlignElements('right')} title="Align Right"><AlignRightIcon /></ToggleButton>
                <div className="border-l h-6 mx-1"></div>
                <ToggleButton onClick={() => onAlignElements('top')} title="Align Top"><AlignTopIcon /></ToggleButton>
                <ToggleButton onClick={() => onAlignElements('middle')} title="Align Middle"><AlignMiddleVerticalIcon /></ToggleButton>
                <ToggleButton onClick={() => onAlignElements('bottom')} title="Align Bottom"><AlignBottomIcon /></ToggleButton>
            </RibbonGroup>

            <RibbonGroup title="Arrange">
                <ToggleButton onClick={() => onUpdateElementsLayer('backward')} title="Send Backward" disabled={isMultiSelect}><SendBackwardIcon /></ToggleButton>
                <ToggleButton onClick={() => onUpdateElementsLayer('forward')} title="Bring Forward" disabled={isMultiSelect}><BringForwardIcon /></ToggleButton>
                <div className="border-l h-6 mx-1"></div>
                <ToggleButton onClick={() => onUpdateElementsLayer('back')} title="Send to Back"><SendToBackIcon /></ToggleButton>
                <ToggleButton onClick={() => onUpdateElementsLayer('front')} title="Bring to Front"><BringToFrontIcon /></ToggleButton>
                <div className="border-l h-6 mx-1"></div>
                <ToggleButton onClick={() => onGroupElements()} title="Group" disabled={!isMultiSelect}><GroupIcon /></ToggleButton>
                <ToggleButton onClick={() => onUngroupElements()} title="Ungroup" disabled={!isGroupSelected}><UngroupIcon /></ToggleButton>
            </RibbonGroup>
        </div>
    );
};

export default FormatToolbar;