import React, { useState, useRef, useEffect, useCallback } from 'react';

// Basic string-to-rgba parsing
const parseColor = (color: string): { r: number, g: number, b: number, a: number } => {
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        const a = hex.length === 8 ? ((bigint >> 24) & 255) / 255 : 1;
        return { r, g, b, a };
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1,
        };
    }
    // Very basic fallback
    return { r: 0, g: 0, b: 0, a: 1 };
};

const toRgbaString = (rgba: { r: number, g: number, b: number, a: number }): string => {
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
};

interface GradientStop {
    id: number;
    color: string;
    pos: number; // 0-100
}

interface GradientValue {
    type: 'linear' | 'radial';
    angle: number;
    stops: GradientStop[];
}

const parseGradient = (gradient: string): GradientValue => {
    const stops: GradientStop[] = [];
    const colorRegex = /(rgba?\(.+?\)|#\w+)\s*(\d+)%/g;
    let match;
    let stopId = 0;
    while ((match = colorRegex.exec(gradient)) !== null) {
        stops.push({ id: stopId++, color: match[1], pos: parseInt(match[2]) });
    }

    const typeMatch = gradient.match(/(linear|radial)-gradient/);
    const type = (typeMatch ? typeMatch[1] : 'linear') as 'linear' | 'radial';

    const angleMatch = gradient.match(/(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1]) : 90;

    if (stops.length < 2) {
         return { type: 'linear', angle: 90, stops: [
            { id: 0, color: '#81cbfd', pos: 0 },
            { id: 1, color: '#3d93fd', pos: 100 }
        ] };
    }

    return { type, angle, stops };
};

const gradientToString = (gradient: GradientValue): string => {
    const stopsString = gradient.stops
        .sort((a, b) => a.pos - b.pos)
        .map(stop => `${stop.color} ${stop.pos}%`)
        .join(', ');

    if (gradient.type === 'linear') {
        return `linear-gradient(${gradient.angle}deg, ${stopsString})`;
    }
    return `radial-gradient(circle, ${stopsString})`;
};

const isGradient = (color: string) => color.includes('gradient');

const ColorPicker: React.FC<{ value: string, onChange: (value: string) => void, disabled?: boolean, onMouseDown?: (e: React.MouseEvent) => void }> = ({ value, onChange, disabled, onMouseDown }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>(isGradient(value) ? 'gradient' : 'solid');
    
    const [solidColor, setSolidColor] = useState(!isGradient(value) ? value : '#000000');
    const [gradient, setGradient] = useState<GradientValue>(isGradient(value) ? parseGradient(value) : parseGradient(''));

    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
       setActiveTab(isGradient(value) ? 'gradient' : 'solid');
       if (isGradient(value)) {
           setGradient(parseGradient(value));
       } else {
           setSolidColor(value);
       }
    }, [value, isOpen]);

    const handleSolidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSolidColor(e.target.value);
        onChange(e.target.value);
    };

    const handleGradientChange = (newGradient: Partial<GradientValue>) => {
        const updatedGradient = { ...gradient, ...newGradient };
        setGradient(updatedGradient);
        onChange(gradientToString(updatedGradient));
    }
    
    const addStop = () => {
        const newStop: GradientStop = {
            id: Date.now(),
            color: '#ffffff',
            pos: 50,
        };
        handleGradientChange({ stops: [...gradient.stops, newStop] });
    }
    
    const removeStop = (id: number) => {
        if (gradient.stops.length <= 2) return;
        handleGradientChange({ stops: gradient.stops.filter(s => s.id !== id) });
    }

    const updateStop = (id: number, props: Partial<Omit<GradientStop, 'id'>>) => {
        handleGradientChange({ stops: gradient.stops.map(s => s.id === id ? {...s, ...props} : s) });
    }

    return (
        <div ref={pickerRef} className="relative" onMouseDown={onMouseDown}>
            <button
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className="w-7 h-7 rounded border border-gray-300 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: value }}
                aria-label="Open color picker"
            />
            {isOpen && (
                <div className="absolute z-20 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3">
                    <div className="flex border-b mb-2">
                        <button onClick={() => setActiveTab('solid')} className={`px-4 py-1 text-sm ${activeTab === 'solid' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}>Solid</button>
                        <button onClick={() => setActiveTab('gradient')} className={`px-4 py-1 text-sm ${activeTab === 'gradient' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}>Gradient</button>
                    </div>

                    {activeTab === 'solid' && (
                        <div className="flex items-center justify-center">
                            <input type="color" value={solidColor} onChange={handleSolidChange} className="w-full h-12 p-0 border-none rounded cursor-pointer" />
                        </div>
                    )}

                    {activeTab === 'gradient' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <label>Type</label>
                                <select value={gradient.type} onChange={e => handleGradientChange({ type: e.target.value as 'linear' | 'radial'})} className="p-1 border rounded text-xs">
                                    <option value="linear">Linear</option>
                                    <option value="radial">Radial</option>
                                </select>
                            </div>
                            {gradient.type === 'linear' && (
                               <div className="flex justify-between items-center text-sm">
                                   <label>Angle</label>
                                   <input type="number" value={gradient.angle} onChange={e => handleGradientChange({ angle: parseInt(e.target.value) })} className="w-20 p-1 border rounded text-xs" />
                                </div>
                            )}
                            <div className="space-y-2">
                                {gradient.stops.map(stop => (
                                    <div key={stop.id} className="flex items-center space-x-2">
                                        <input type="color" value={stop.color} onChange={e => updateStop(stop.id, { color: e.target.value })} className="w-6 h-6 p-0 border-none rounded cursor-pointer" />
                                        <input type="range" min="0" max="100" value={stop.pos} onChange={e => updateStop(stop.id, { pos: parseInt(e.target.value) })} className="flex-1" />
                                        <span className="text-xs w-8 text-right">{stop.pos}%</span>
                                        <button onClick={() => removeStop(stop.id)} className="text-red-500 hover:text-red-700 text-lg" disabled={gradient.stops.length <= 2}>&times;</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addStop} className="w-full text-center text-xs py-1 bg-gray-100 hover:bg-gray-200 rounded">Add Stop</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ColorPicker;