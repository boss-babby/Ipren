import React, { useState, useEffect, useRef } from 'react';
import { ChartElement, ChartDataPoint } from '../types';
import { CloseIcon, PlusCircleIcon, TrashIcon } from './icons';

interface ChartDataEditorModalProps {
    element: ChartElement;
    onClose: () => void;
    onSave: (elementId: string, data: ChartDataPoint[]) => void;
}

const ChartDataEditorModal: React.FC<ChartDataEditorModalProps> = ({ element, onClose, onSave }) => {
    const [data, setData] = useState<ChartDataPoint[]>(element.data);
    const [headers, setHeaders] = useState<string[]>(['name', ...element.config.dataKeys]);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ 
        x: window.innerWidth / 2 - 400, 
        y: 150 
    });

    useEffect(() => {
        setData(element.data);
        setHeaders(['name', ...element.config.dataKeys]);
    }, [element]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            setPosition({
                x: moveEvent.clientX - startX,
                y: moveEvent.clientY - startY,
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleCellChange = (rowIndex: number, header: string, value: string) => {
        const newData = [...data];
        const row = { ...newData[rowIndex] };
        if (header === 'name') {
            row[header] = value;
        } else {
            const numValue = parseFloat(value);
            row[header] = isNaN(numValue) ? 0 : numValue;
        }
        newData[rowIndex] = row;
        setData(newData);
    };
    
    const handleHeaderChange = (oldHeader: string, newHeader: string) => {
        if (newHeader === oldHeader || newHeader.trim() === '' || newHeader === 'name' || headers.includes(newHeader)) {
            return; // No change, empty, reserved, or duplicate
        }
        const newHeaders = headers.map(h => h === oldHeader ? newHeader : h);
        setHeaders(newHeaders);

        const newData = data.map(row => {
            const newRow = {...row};
            if(oldHeader in newRow) {
                newRow[newHeader] = newRow[oldHeader];
                delete newRow[oldHeader];
            }
            return newRow;
        });
        setData(newData);
    };

    const addRow = () => {
        const newRow: ChartDataPoint = { name: `Item ${data.length + 1}` };
        headers.slice(1).forEach(h => newRow[h] = 0);
        setData([...data, newRow]);
    };

    const removeRow = (index: number) => {
        if (data.length > 1) {
            setData(data.filter((_, i) => i !== index));
        }
    };
    
    const addSeries = () => {
        let newSeriesName = `Series ${headers.length}`;
        let i = headers.length;
        while (headers.includes(newSeriesName)) {
            i++;
            newSeriesName = `Series ${i}`;
        }
        setHeaders([...headers, newSeriesName]);
        setData(data.map(row => ({...row, [newSeriesName]: 0})));
    };
    
    const removeSeries = (header: string) => {
        if (headers.length > 2) { // Always keep 'name' and at least one data series
            setHeaders(headers.filter(h => h !== header));
            setData(data.map(row => {
                const newRow = {...row};
                delete newRow[header];
                return newRow;
            }));
        }
    };

    const handleSave = () => {
        onSave(element.id, data);
        onClose();
    };

    return (
        <div
            ref={panelRef}
            className="fixed w-[800px] max-h-[600px] bg-gray-50 rounded-lg shadow-2xl border border-gray-300 flex flex-col"
            style={{ top: position.y, left: position.x, zIndex: 1002 }}
        >
            <div 
                className="flex items-center justify-between p-3 bg-slate-700 text-white rounded-t-lg cursor-move"
                onMouseDown={handleDragStart}
            >
                <h3 className="text-md font-semibold">Edit Chart Data</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
                <table className="w-full text-sm text-left text-gray-700 bg-white border-collapse">
                    <thead className="text-xs text-gray-800 uppercase bg-gray-100 sticky top-0">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={header} scope="col" className="px-4 py-2 border">
                                    <div className="flex items-center justify-between">
                                        <input 
                                            type="text"
                                            value={header}
                                            onChange={e => handleHeaderChange(header, e.target.value)}
                                            readOnly={header === 'name'}
                                            className="font-bold bg-transparent outline-none w-full"
                                        />
                                        {header !== 'name' && (
                                            <button onClick={() => removeSeries(header)} className="ml-2 text-red-500 hover:text-red-700" title={`Remove ${header}`}>
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-2 py-2 border w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                                {headers.map(header => (
                                    <td key={`${rowIndex}-${header}`} className="px-2 py-1 border">
                                        <input
                                            type={header === 'name' ? 'text' : 'number'}
                                            value={row[header] as string | number}
                                            onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                                            className="w-full p-1 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 rounded outline-none"
                                        />
                                    </td>
                                ))}
                                <td className="px-2 py-1 border text-center">
                                    <button onClick={() => removeRow(rowIndex)} className="text-red-500 hover:text-red-700" title="Remove Row">
                                        <TrashIcon />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="mt-4 flex space-x-4">
                    <button onClick={addRow} className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        <PlusCircleIcon /><span>Add Row</span>
                    </button>
                    <button onClick={addSeries} className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 font-medium">
                        <PlusCircleIcon /><span>Add Series</span>
                    </button>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">
                    Cancel
                </button>
                <button onClick={handleSave} className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 font-semibold">
                    Apply & Close
                </button>
            </div>
        </div>
    );
};

export default ChartDataEditorModal;