import React, { useState, useEffect } from 'react';
import { TableElement, getTableThemeById } from '../types';

interface TableEditorProps {
    element: TableElement;
    onUpdate: (props: Partial<TableElement>) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ element, onUpdate }) => {
    // Use a key to force re-render when the element ID changes, ensuring fresh state.
    const [cellData, setCellData] = useState(element.cellData);

    useEffect(() => {
        setCellData(element.cellData);
    }, [element.cellData]);

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newData = cellData.map((row, rIdx) => 
            rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell)) : row
        );
        // Do not update state here directly for every input for performance reasons.
        // Instead, we'll update on blur. The visual update comes from contentEditable itself.
        // But we need to keep a reference to the latest data.
        // A better approach is to just update on blur.
    };
    
    const handleCellBlur = (e: React.FocusEvent<HTMLDivElement>, rowIndex: number, colIndex: number) => {
        const value = e.currentTarget.innerHTML;
        const currentDataString = JSON.stringify(element.cellData);
        const newData = element.cellData.map((row, rIdx) => 
            rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell)) : row
        );

        // Only call update if the data has actually changed.
        if (JSON.stringify(newData) !== currentDataString) {
            onUpdate({ cellData: newData });
        }
    };

    const theme = getTableThemeById(element.themeId);

    const getCellStyle = (isHeader: boolean, rowIndex: number): React.CSSProperties => {
        const style: React.CSSProperties = { color: theme.cellColor };

        // Borders
        if (theme.id === 'minimal') {
            style.border = 'none';
            if (isHeader) {
                style.borderBottom = `2px solid ${getTableThemeById('gray').borderColor}`;
            }
        } else {
            style.border = `1px solid ${theme.borderColor}`;
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
        <table className="w-full h-full border-collapse pointer-events-auto" style={{fontSize: '16px'}}>
            <colgroup>
                {Array.from({ length: element.cols }).map((_, i) => <col key={i} style={{ width: `${100/element.cols}%`}} />)}
            </colgroup>
            <tbody>
                {element.cellData.map((row, rIdx) => (
                    <tr key={rIdx}>
                        {row.map((cell, cIdx) => {
                            const isHeader = element.headerRow && rIdx === 0;
                            return (
                                <td key={cIdx} style={getCellStyle(isHeader, rIdx)} className="p-1 align-top">
                                    <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        onMouseDown={e => e.stopPropagation()}
                                        onBlur={(e) => handleCellBlur(e, rIdx, cIdx)}
                                        className="w-full h-full outline-none"
                                        dangerouslySetInnerHTML={{ __html: cell }}
                                    />
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default TableEditor;