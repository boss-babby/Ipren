import React from 'react';
import { SlideElement, TextElement, ImageElement, ShapeElement, ElementType, VideoElement, AudioElement, IconElement, TableElement, SmartArtElement, SmartArtNode, tableThemes } from '../types';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, BulletListIcon, NumberedListIcon } from './icons';
import { v4 as uuidv4 } from 'uuid';

interface ElementFormatPanelProps {
  element: SlideElement;
  onUpdateElement: (elementId: string, props: Partial<SlideElement>) => void;
}

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Impact'];

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

const ToggleControl: React.FC<{ label: string; isChecked: boolean; onChange: (checked: boolean) => void; }> = ({ label, isChecked, onChange }) => (
    <LabelledControl label={label}>
        <button onClick={() => onChange(!isChecked)} className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isChecked ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </LabelledControl>
);


const TextFormatPanel: React.FC<{ element: TextElement; onUpdateElement: (id: string, props: Partial<TextElement>) => void }> = ({ element, onUpdateElement }) => {
  const handleUpdate = (props: Partial<TextElement>) => onUpdateElement(element.id, props);
  
  const handleCommand = (e: React.MouseEvent, command: string) => {
    e.preventDefault(); // Prevent editor from losing focus
    document.execCommand(command, false);
    // Note: The parent component EditableElement will sync the state on blur.
  };

  return (
    <>
      <PanelSection title="Text">
        <LabelledControl label="Font">
             <select aria-label="Font Family" value={element.fontFamily} onChange={(e) => handleUpdate({ fontFamily: e.target.value })} className="p-1 max-w-[120px] border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
        </LabelledControl>
         <LabelledControl label="Size">
            <input type="number" aria-label="Font Size" value={element.fontSize} onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value, 10) })} className="w-20 p-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </LabelledControl>
        <LabelledControl label="Color">
             <input type="color" aria-label="Font Color" value={element.color} onChange={(e) => handleUpdate({ color: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer bg-transparent" />
        </LabelledControl>
      </PanelSection>

      <PanelSection title="Style">
        <div className="flex items-center justify-around">
            <button onMouseDown={(e) => handleCommand(e, 'bold')} className="p-2 rounded hover:bg-gray-200" title="Bold"><BoldIcon /></button>
            <button onMouseDown={(e) => handleCommand(e, 'italic')} className="p-2 rounded hover:bg-gray-200" title="Italic"><ItalicIcon /></button>
            <button onMouseDown={(e) => handleCommand(e, 'underline')} className="p-2 rounded hover:bg-gray-200" title="Underline"><UnderlineIcon /></button>
        </div>
      </PanelSection>

       <PanelSection title="Paragraph">
        <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-around border-r">
                <button onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')} className={`p-2 rounded hover:bg-gray-200`} title="Bulleted List"><BulletListIcon /></button>
                <button onMouseDown={(e) => handleCommand(e, 'insertOrderedList')} className={`p-2 rounded hover:bg-gray-200`} title="Numbered List"><NumberedListIcon /></button>
            </div>
            <div className="flex items-center justify-around">
                <button onClick={() => handleUpdate({ textAlign: 'left' })} className={`p-2 rounded ${element.textAlign === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`} title="Align Left"><AlignLeftIcon /></button>
                <button onClick={() => handleUpdate({ textAlign: 'center' })} className={`p-2 rounded ${element.textAlign === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`} title="Align Center"><AlignCenterIcon /></button>
                <button onClick={() => handleUpdate({ textAlign: 'right' })} className={`p-2 rounded ${element.textAlign === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`} title="Align Right"><AlignRightIcon /></button>
            </div>
        </div>
      </PanelSection>

      <PanelSection title="Text Effects">
        <ToggleControl
            label="Shadow"
            isChecked={element.textShadow?.enabled ?? false}
            onChange={checked => handleUpdate({ textShadow: { ...(element.textShadow || { offsetX: 2, offsetY: 2, blur: 4, color: '#00000080' }), enabled: checked } })}
        />
        {element.textShadow?.enabled && (
            <div className="pl-4 mt-2 space-y-3 pt-3 border-t">
                <LabelledControl label="X Offset">
                    <input type="number" value={element.textShadow.offsetX} onChange={e => handleUpdate({ textShadow: { ...element.textShadow!, offsetX: parseInt(e.target.value) } })} className="w-20 p-1 border border-gray-300 rounded text-sm"/>
                </LabelledControl>
                <LabelledControl label="Y Offset">
                    <input type="number" value={element.textShadow.offsetY} onChange={e => handleUpdate({ textShadow: { ...element.textShadow!, offsetY: parseInt(e.target.value) } })} className="w-20 p-1 border border-gray-300 rounded text-sm"/>
                </LabelledControl>
                <LabelledControl label="Blur">
                    <input type="number" min="0" value={element.textShadow.blur} onChange={e => handleUpdate({ textShadow: { ...element.textShadow!, blur: parseInt(e.target.value) } })} className="w-20 p-1 border border-gray-300 rounded text-sm"/>
                </LabelledControl>
                <LabelledControl label="Color">
                    <input type="color" value={element.textShadow.color} onChange={e => handleUpdate({ textShadow: { ...element.textShadow!, color: e.target.value } })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
                </LabelledControl>
            </div>
        )}
      </PanelSection>
      <PanelSection title="Text Outline">
          <ToggleControl
            label="Stroke"
            isChecked={element.textStroke?.enabled ?? false}
            onChange={checked => handleUpdate({ textStroke: { ...(element.textStroke || { width: 1, color: '#000000' }), enabled: checked } })}
        />
        {element.textStroke?.enabled && (
            <div className="pl-4 mt-2 space-y-3 pt-3 border-t">
                <LabelledControl label="Width">
                    <input type="number" min="0" value={element.textStroke.width} onChange={e => handleUpdate({ textStroke: { ...element.textStroke!, width: parseInt(e.target.value) } })} className="w-20 p-1 border border-gray-300 rounded text-sm"/>
                </LabelledControl>
                <LabelledControl label="Color">
                    <input type="color" value={element.textStroke.color} onChange={e => handleUpdate({ textStroke: { ...element.textStroke!, color: e.target.value } })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
                </LabelledControl>
            </div>
        )}
      </PanelSection>
    </>
  );
};

const ImageFormatPanel: React.FC<{ element: ImageElement; onUpdateElement: (id: string, props: Partial<ImageElement>) => void }> = ({ element, onUpdateElement }) => {
    const handleFilterChange = (filter: 'brightness' | 'contrast', value: number) => {
        onUpdateElement(element.id, { filters: { ...element.filters, [filter]: value } });
    };
    return (
        <PanelSection title="Image Effects">
            <LabelledControl label="Brightness">
                <input type="range" min="0" max="200" value={element.filters.brightness} onChange={e => handleFilterChange('brightness', parseInt(e.target.value))} className="w-32" />
            </LabelledControl>
             <LabelledControl label="Contrast">
                <input type="range" min="0" max="200" value={element.filters.contrast} onChange={e => handleFilterChange('contrast', parseInt(e.target.value))} className="w-32" />
            </LabelledControl>
        </PanelSection>
    );
};

const ShapeFormatPanel: React.FC<{ element: ShapeElement; onUpdateElement: (id: string, props: Partial<ShapeElement>) => void }> = ({ element, onUpdateElement }) => {
    return (
      <>
        <PanelSection title="Fill">
            <LabelledControl label="Color">
                <input type="color" value={element.backgroundColor} onChange={e => onUpdateElement(element.id, { backgroundColor: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
            </LabelledControl>
        </PanelSection>
        <PanelSection title="Border">
            <LabelledControl label="Color">
                <input type="color" value={element.borderColor} onChange={e => onUpdateElement(element.id, { borderColor: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
            </LabelledControl>
            <LabelledControl label="Width">
                <input type="number" min="0" max="50" value={element.borderWidth} onChange={e => onUpdateElement(element.id, { borderWidth: parseInt(e.target.value) })} className="w-20 p-1 border border-gray-300 rounded text-sm"/>
            </LabelledControl>
        </PanelSection>
      </>
    );
};

const TableFormatPanel: React.FC<{ element: TableElement; onUpdateElement: (id: string, props: Partial<TableElement>) => void }> = ({ element, onUpdateElement }) => (
    <>
    <PanelSection title="Table Style">
        <LabelledControl label="Theme">
            <select
                value={element.themeId}
                onChange={e => onUpdateElement(element.id, { themeId: e.target.value })}
                className="p-1 max-w-[120px] border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
                {tableThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                        {theme.name}
                    </option>
                ))}
            </select>
        </LabelledControl>
        <ToggleControl label="Header Row" isChecked={element.headerRow} onChange={checked => onUpdateElement(element.id, { headerRow: checked })} />
        <ToggleControl label="Banded Rows" isChecked={element.bandedRows} onChange={checked => onUpdateElement(element.id, { bandedRows: checked })} />
    </PanelSection>
     <PanelSection title="Table Actions">
        <p className="text-sm text-gray-500">More table actions like adding/removing rows and columns coming soon.</p>
    </PanelSection>
    </>
);

const SmartArtFormatPanel: React.FC<{ element: SmartArtElement; onUpdateElement: (id: string, props: Partial<SmartArtElement>) => void }> = ({ element, onUpdateElement }) => {
    return (
    <>
    <PanelSection title="SmartArt Style">
        <LabelledControl label="Node Color">
            <input type="color" value={element.nodeColor} onChange={e => onUpdateElement(element.id, { nodeColor: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
        </LabelledControl>
        <LabelledControl label="Line Color">
            <input type="color" value={element.lineColor} onChange={e => onUpdateElement(element.id, { lineColor: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
        </LabelledControl>
    </PanelSection>
     <PanelSection title="Edit Diagram">
        <p className="text-xs text-gray-500">Use the controls on the diagram shapes on the slide to add or remove nodes.</p>
    </PanelSection>
    </>
    );
};


const VideoFormatPanel: React.FC<{ element: VideoElement; onUpdateElement: (id:string, props: Partial<VideoElement>) => void }> = ({ element, onUpdateElement }) => (
    <PanelSection title="Video Options">
        <ToggleControl label="Autoplay" isChecked={element.autoplay} onChange={checked => onUpdateElement(element.id, { autoplay: checked })} />
        <ToggleControl label="Show Controls" isChecked={element.controls} onChange={checked => onUpdateElement(element.id, { controls: checked })} />
    </PanelSection>
);

const AudioFormatPanel: React.FC<{ element: AudioElement; onUpdateElement: (id: string, props: Partial<AudioElement>) => void }> = ({ element, onUpdateElement }) => (
    <PanelSection title="Audio Options">
        <ToggleControl label="Autoplay" isChecked={element.autoplay} onChange={checked => onUpdateElement(element.id, { autoplay: checked })} />
        <ToggleControl label="Show Controls" isChecked={element.controls} onChange={checked => onUpdateElement(element.id, { controls: checked })} />
    </PanelSection>
);

const IconFormatPanel: React.FC<{ element: IconElement; onUpdateElement: (id: string, props: Partial<IconElement>) => void }> = ({ element, onUpdateElement }) => (
    <PanelSection title="Icon">
        <LabelledControl label="Color">
            <input type="color" value={element.color} onChange={e => onUpdateElement(element.id, { color: e.target.value })} className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"/>
        </LabelledControl>
    </PanelSection>
);


const ElementFormatPanel: React.FC<ElementFormatPanelProps> = ({ element, onUpdateElement }) => {
  switch(element.type) {
    case ElementType.TITLE:
    case ElementType.SUBTITLE:
    case ElementType.CONTENT:
      return <TextFormatPanel element={element as TextElement} onUpdateElement={onUpdateElement} />;
    case ElementType.IMAGE:
      return <ImageFormatPanel element={element as ImageElement} onUpdateElement={onUpdateElement} />;
    case ElementType.SHAPE:
      return <ShapeFormatPanel element={element as ShapeElement} onUpdateElement={onUpdateElement} />;
    case ElementType.TABLE:
        return <TableFormatPanel element={element as TableElement} onUpdateElement={onUpdateElement} />;
    case ElementType.SMART_ART:
        return <SmartArtFormatPanel element={element as SmartArtElement} onUpdateElement={onUpdateElement} />;
    case ElementType.VIDEO:
      return <VideoFormatPanel element={element as VideoElement} onUpdateElement={onUpdateElement} />;
    case ElementType.AUDIO:
      return <AudioFormatPanel element={element as AudioElement} onUpdateElement={onUpdateElement} />;
    case ElementType.ICON:
      return <IconFormatPanel element={element as IconElement} onUpdateElement={onUpdateElement} />;
    case ElementType.THREED_MODEL:
        return <PanelSection title="3D Model"><p className="text-sm text-gray-600">Use mouse to rotate model. More options coming soon.</p></PanelSection>
    default:
      return <p className="text-sm text-gray-500 p-4">Select an element to format.</p>;
  }
};

export default ElementFormatPanel;
