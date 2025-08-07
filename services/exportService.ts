import PptxGenJS from 'pptxgenjs';
import { Slide as AppSlide, SlideElement, ElementType, TextElement, ImageElement, ShapeElement, IconElement, TableElement, ShapeType, SmartArtElement, SmartArtNode, ChartElement, ChartType, getTableThemeById } from '../types';

// Inferred types from PptxGenJS to avoid import issues in some environments.
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;
type IAddImageOpts = Parameters<PptxSlide['addImage']>[0];
type IAddShapeOpts = Parameters<PptxSlide['addShape']>[1];
type IAddTableOpts = Parameters<PptxSlide['addTable']>[1];
type IAddTextOpts = Parameters<PptxSlide['addText']>[1];
type TextPropsOptions = IAddTextOpts;
type TableRow = Parameters<PptxSlide['addTable']>[0];
type TableProps = IAddTableOpts;
type IChartOpts = Parameters<PptxSlide['addChart']>[2];


// --- UTILITY FUNCTIONS ---

const SLIDE_WIDTH_IN = 13.333;
const SLIDE_HEIGHT_IN = 7.5;
const SLIDE_WIDTH_PX = 1280;
const SLIDE_HEIGHT_PX = 720;
const PX_TO_PT = 0.75;

// Helper to convert pixel dimensions to percentage strings for pptxgenjs
const pos = (val: number, base: 'w' | 'h'): `${number}%` => {
    const baseVal = base === 'w' ? SLIDE_WIDTH_PX : SLIDE_HEIGHT_PX;
    return `${(val / baseVal) * 100}%`;
};

// Helper to strip HTML from content
const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// Helper to parse color and return hex and transparency
const parseColor = (colorStr: string): { color: string, transparency: number } => {
    if (!colorStr) return { color: '000000', transparency: 100 };
    
    // First, try to get solid color from gradient
    if (colorStr.includes('gradient')) {
        const match = colorStr.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3})|rgba?\(.*\)/);
        colorStr = match ? match[0] : '#000000';
    }

    if (colorStr.startsWith('#')) {
        let hex = colorStr.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 8) { // Handle #RRGGBBAA
            const alphaHex = hex.substring(6, 8);
            const alpha = parseInt(alphaHex, 16) / 255;
            return { color: hex.substring(0, 6), transparency: Math.round((1 - alpha) * 100) };
        }
        return { color: hex.substring(0, 6), transparency: 0 };
    }

    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
        const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
        return { color: `${r}${g}${b}`, transparency: Math.round((1 - a) * 100) };
    }

    return { color: '000000', transparency: 0 }; // Default to opaque black on failure
};


// Helper to map our ShapeType to PptxGenJS shape types
const mapShapeType = (shapeType: ShapeType): string => {
    switch (shapeType) {
        case ShapeType.RECTANGLE: return 'rect';
        case ShapeType.OVAL: return 'oval';
        case ShapeType.TRIANGLE: return 'triangle';
        case ShapeType.RIGHT_ARROW: return 'rightArrow';
        case ShapeType.STAR_5: return 'star5Point';
        default: return 'rect';
    }
}

const mapChartType = (chartType: ChartType): string => {
    switch (chartType) {
        case ChartType.BAR: return 'bar';
        case ChartType.LINE: return 'line';
        case ChartType.PIE: return 'pie';
        case ChartType.RADAR: return 'radar';
        case ChartType.SCATTER: return 'scatter';
        default: return 'bar';
    }
}

// --- SmartArt to Shapes Conversion ---
const addSmartArtAsShapes = (pptxSlide: PptxSlide, element: SmartArtElement) => {
    // This is a simplified visual representation, not a true SmartArt object.
    const nodeWidth = 1.5; // inches
    const nodeHeight = 0.75;
    const hSpacing = 0.5;
    const vSpacing = 1;

    const { color: nodeColorHex } = parseColor(element.nodeColor);
    const { color: lineColorHex } = parseColor(element.lineColor);

    const base_x = (element.x / SLIDE_WIDTH_PX) * SLIDE_WIDTH_IN;
    const base_y = (element.y / SLIDE_HEIGHT_PX) * SLIDE_HEIGHT_IN;

    // A recursive function to draw nodes and connectors
    const drawNodeAndChildren = (node: SmartArtNode, x: number, y: number, level: number): { width: number } => {
        // Draw the node itself
        pptxSlide.addShape('rect' as any, {
            x, y, w: nodeWidth, h: nodeHeight,
            fill: { color: nodeColorHex },
        });
        pptxSlide.addText(stripHtml(node.text), {
            x, y, w: nodeWidth, h: nodeHeight,
            align: 'center', valign: 'middle',
            color: 'FFFFFF', fontSize: 10,
        });

        if (!node.children || node.children.length === 0) {
            return { width: nodeWidth };
        }
        
        // Draw connectors to children
        const child_y = y + nodeHeight + vSpacing;
        let cumulativeWidth = 0;
        const childLayouts = node.children.map(child => {
            const layout = drawNodeAndChildren(child, x + cumulativeWidth, child_y, level + 1);
            cumulativeWidth += layout.width + hSpacing;
            return { ...layout, startX: x + cumulativeWidth - layout.width - hSpacing };
        });
        
        cumulativeWidth -= hSpacing; // remove last spacing

        const totalChildrenWidth = cumulativeWidth;
        const children_center_x = x + totalChildrenWidth / 2 - nodeWidth / 2;

        // Reposition children to be centered under the parent
        let currentX = x - (totalChildrenWidth / 2) + (nodeWidth / 2);
        for(const child of node.children) {
             const { width: childWidth } = drawNodeAndChildren(child, currentX, child_y, level + 1);
             const childCenterX = currentX + childWidth / 2;
             
             // Connector from parent to child
             pptxSlide.addShape('line' as any, {
                x: x + nodeWidth / 2,
                y: y + nodeHeight,
                w: childCenterX - (x + nodeWidth / 2),
                h: child_y - (y + nodeHeight),
                line: { color: lineColorHex, width: 1 },
             });
             currentX += childWidth + hSpacing;
        }

        return { width: Math.max(nodeWidth, totalChildrenWidth) };
    };

    drawNodeAndChildren(element.data, base_x, base_y, 0);
};


// --- MAIN EXPORT FUNCTION ---

export const exportToPptx = async (slides: AppSlide[], presentationTitle: string = 'Presentation') => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    for (const slideData of slides) {
        const pptxSlide = pptx.addSlide();

        // Set Slide Background
        if (slideData.backgroundImage && !slideData.backgroundImage.includes('gradient')) {
             pptxSlide.background = { path: slideData.backgroundImage };
        } else if (slideData.backgroundColor) {
             const { color, transparency } = parseColor(slideData.backgroundImage || slideData.backgroundColor);
             pptxSlide.background = { color, alpha: transparency };
        }

        // Add elements
        for (const el of slideData.elements) {
            const commonOptions: { x: `${number}%`, y: `${number}%`, w: `${number}%`, h: `${number}%`, rotate: number } = {
                x: pos(el.x, 'w'),
                y: pos(el.y, 'h'),
                w: pos(el.width, 'w'),
                h: pos(el.height, 'h'),
                rotate: el.rotation,
            };

            switch(el.type) {
                case ElementType.TITLE:
                case ElementType.SUBTITLE:
                case ElementType.CONTENT: {
                    const textEl = el as TextElement;
                    const { color, transparency } = parseColor(textEl.color);

                    const textOptions: TextPropsOptions = {
                        ...commonOptions,
                        fontSize: textEl.fontSize * PX_TO_PT,
                        fontFace: textEl.fontFamily,
                        color: color,
                        transparency: transparency,
                        bold: textEl.fontWeight === 'bold',
                        italic: textEl.fontStyle === 'italic',
                        align: textEl.textAlign,
                        valign: 'middle',
                    };

                    if (textEl.textDecoration === 'underline') {
                        textOptions.underline = { style: 'sng' };
                    }

                    pptxSlide.addText(stripHtml(textEl.content), textOptions);
                    break;
                }
                case ElementType.IMAGE: {
                    const imgEl = el as ImageElement;
                    pptxSlide.addImage({ ...commonOptions, path: imgEl.src });
                    break;
                }
                case ElementType.SHAPE: {
                     const shapeEl = el as ShapeElement;
                     const fill = parseColor(shapeEl.backgroundColor);
                     const border = parseColor(shapeEl.borderColor);
                     
                     pptxSlide.addShape(mapShapeType(shapeEl.shapeType) as any, {
                         ...commonOptions,
                         fill: { color: fill.color, alpha: fill.transparency },
                         line: { color: border.color, alpha: border.transparency, width: shapeEl.borderWidth },
                     });
                     break;
                }
                case ElementType.ICON: {
                    const iconEl = el as IconElement;
                    const { color } = parseColor(iconEl.color);
                    // Embed color into SVG string for export
                    const coloredSvg = iconEl.svgString.replace(/<svg/g, `<svg fill="#${color}"`);
                    const dataUrl = `data:image/svg+xml;base64,${btoa(coloredSvg)}`;
                    pptxSlide.addImage({ ...commonOptions, data: dataUrl });
                    break;
                }
                case ElementType.TABLE: {
                    const tableEl = el as TableElement;
                    const theme = getTableThemeById(tableEl.themeId);

                    const tableRows: TableRow = tableEl.cellData.map(row => row.map(cell => ({
                        text: stripHtml(cell),
                        options: {
                            valign: 'top' as const,
                            color: parseColor(theme.cellColor).color,
                        }
                    })));

                    const tableOptions: TableProps = {
                        ...commonOptions,
                        colW: Array(tableEl.cols).fill(el.width / tableEl.cols / 96), // approximate inches
                        border: theme.id === 'minimal' ? undefined : { type: 'solid', pt: 1, color: parseColor(theme.borderColor).color },
                    };
                    
                    if (tableEl.bandedRows) {
                        (tableOptions as any).bandedRows = true;
                        (tableOptions as any).bandedRowColor = parseColor(theme.bandedRowBackground).color;
                    }

                    if (tableEl.headerRow && tableRows.length > 0) {
                        const { color: headerBgHex } = parseColor(theme.headerBackground);
                        const { color: headerColorHex } = parseColor(theme.headerColor);
                        tableRows[0] = tableRows[0].map(cell => ({ ...cell, options: { ...cell.options, bold: true, color: headerColorHex, fill: { color: headerBgHex } }}));
                    }
                    
                    if (theme.id === 'minimal' && tableEl.headerRow && tableRows.length > 0) {
                        const grayBorderColor = parseColor(getTableThemeById('gray').borderColor).color;
                         tableRows[0] = tableRows[0].map(cell => ({ 
                            ...cell, 
                            options: { 
                                ...cell.options, 
                                border: [
                                    {}, // Top
                                    {}, // Right
                                    { type: 'solid', pt: 2, color: grayBorderColor }, // Bottom
                                    {}  // Left
                                ] 
                            }
                        }));
                    }
                    
                    pptxSlide.addTable(tableRows, tableOptions);
                    break;
                }
                case ElementType.CHART: {
                    const chartEl = el as ChartElement;
                    if(chartEl.chartType === ChartType.WATERFALL) { // PptxGenJS doesn't support waterfall charts
                        pptxSlide.addShape('rect' as any, { ...commonOptions, fill: { color: 'F1F5F9' }, line: { color: '94A3B8', dashType: 'dash' } });
                        pptxSlide.addText(`[Waterfall Chart]`, { ...commonOptions, align: 'center', valign: 'middle', color: '64748B' });
                        break;
                    }
                    const pptxChartType = mapChartType(chartEl.chartType);
                    const labels = chartEl.data.map(d => d.name);
                    const series = chartEl.config.dataKeys.map(key => ({
                        name: key,
                        labels,
                        values: chartEl.data.map(d => d[key] as number)
                    }));
                    
                    const chartOptions: IChartOpts = {
                        ...commonOptions,
                        showLegend: chartEl.config.showLegend,
                        barDir: 'col',
                        chartColors: chartEl.config.colors.map(c => parseColor(c).color),
                    };

                    if (chartEl.config.showGrid) {
                        (chartOptions as any).valAxisGridLine = { color: 'EAEAEA', style: 'solid', size: 1 };
                    }

                    pptxSlide.addChart(pptxChartType as any, series, chartOptions);
                    break;
                }
                case ElementType.SMART_ART:
                    addSmartArtAsShapes(pptxSlide, el as SmartArtElement);
                    break;
                
                // Placeholder for other complex elements
                case ElementType.THREED_MODEL:
                case ElementType.VIDEO:
                case ElementType.AUDIO: {
                    const typeName = el.type.replace(/_/g, ' ');
                     pptxSlide.addShape('rect' as any, {
                         ...commonOptions,
                         fill: { color: 'F1F5F9' },
                         line: { color: '94A3B8', dashType: 'dash' }
                     });
                     pptxSlide.addText(`[${typeName}]`, {
                         ...commonOptions,
                         align: 'center',
                         valign: 'middle',
                         color: '64748B',
                     });
                     break;
                }
            }
        }
    }

    pptx.writeFile({ fileName: `${presentationTitle}.pptx` });
};
