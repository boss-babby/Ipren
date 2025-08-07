import React, { useState, useRef, useEffect } from 'react';
import { NewSlideIcon, DesignIdeasIcon, SlideShowIcon, TextBoxIcon, ShapesIcon, PicturesIcon, VideoIcon, AudioIcon, ThreeDIcon, SvgIcon, RectangleIcon, OvalIcon, TriangleIcon, RightArrowIcon, StarIcon, TableIcon, SmartArtIcon, ChartIcon, BarChartIcon, LineChartIcon, PieChartIcon, ScatterChartIcon, RadarChartIcon, WaterfallChartIcon, HierarchyIcon, BasicProcessIcon, CycleIcon, VerticalChevronIcon, StepUpIcon, CircularBendingIcon, ContinuousArrowProcessIcon, TimelineIcon, FunnelIcon, GearsIcon, BasicChevronProcessIcon, AccentProcessIcon, CircleArrowProcessIcon, DetailedProcessIcon, ContinuousCycleIcon, SegmentedCycleIcon, RadialCycleIcon, BasicPyramidIcon, InvertedPyramidIcon, PyramidListIcon, SegmentedPyramidIcon, AIAssistantIcon, KeyIcon, ExportIcon, LoadingSpinner, NoTransitionIcon, FadeIcon, PushIcon, WipeIcon, ZoomIcon, MorphIcon, AnimationIcon, AnimationPaneIcon, FadeInIcon, FlyInIcon, ZoomInIcon, PulseIcon, SpinIcon, TadaIcon, MotionPathIcon, LineRightIcon, LineDownIcon, DiagonalDownRightIcon, CustomPathIcon, LinePathIcon, CirclePathIcon, PdfIcon, SearchIcon, GifIcon, UndoIcon, RedoIcon } from './icons';
import { Slide, SlideElement, ElementType, TextElement, ShapeElement, ShapeType, ImageElement, VideoElement, AudioElement, IconElement, ThreeDModelElement, TableElement, SmartArtElement, SmartArtType, SmartArtNode, Theme, ChartElement, ChartType, TransitionType, Animation, AnimationEffect, AnimationTrigger, AnimationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import FormatToolbar from './FormatToolbar';
import ColorPicker from './ColorPicker';
import ApiKeyModal from './ApiKeyModal';
import { DrawingState } from '../App';

interface RibbonProps {
  onNewSlide: () => void;
  onPresent: () => void;
  onAddElement: (element: SlideElement) => void;
  onToggleAIAssistant: () => void;
  onToggleAnimationPane: () => void;
  onToggleImageSearch: () => void;
  onToggleIconSearch: () => void;
  onToggleGifSearch: () => void;
  selectedElements: SlideElement[];
  onUpdateElement: (id: string, props: Partial<SlideElement>) => void;
  onUpdateElements: (updates: Array<{id: string, props: Partial<SlideElement>}>) => void;
  currentSlide: Slide | null;
  onUpdateSlide: (props: Partial<Slide>) => void;
  canvasColor: string;
  onCanvasColorChange: (color: string) => void;
  onSaveApiKeys: (keys: { unsplash: string; pexels: string; pixabay: string; giphy: string; tenor: string; }) => void;
  onExportToPptx: () => void;
  onExportToPdf: () => void;
  isExporting: boolean;
  onUpdateElementsLayer: (direction: 'front' | 'back' | 'forward' | 'backward') => void;
  onAlignElements: (alignment: 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right') => void;
  onGroupElements: () => void;
  onUngroupElements: () => void;
  onSetTheme: (themeId: string) => void;
  themes: Theme[];
  onApplyTransitionToAll: () => void;
  onSetDrawingState: (state: DrawingState) => void;
  onOpenChartEditor: (chartId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type Tab = 'File' | 'Home' | 'Insert' | 'Draw' | 'Design' | 'Transitions' | 'Animations' | 'Slide Show' | 'Format';

const Ribbon: React.FC<RibbonProps> = ({ onNewSlide, onPresent, onAddElement, onToggleAIAssistant, onToggleAnimationPane, onToggleImageSearch, onToggleIconSearch, onToggleGifSearch, selectedElements, onUpdateElement, onUpdateElements, onGroupElements, onUngroupElements, currentSlide, onUpdateSlide, canvasColor, onCanvasColorChange, onSaveApiKeys, onExportToPptx, onExportToPdf, isExporting, onUpdateElementsLayer, onAlignElements, onSetTheme, themes, onApplyTransitionToAll, onSetDrawingState, onOpenChartEditor, onUndo, onRedo, canUndo, canRedo }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [dropdowns, setDropdowns] = useState({
    shapes: false,
    table: false,
    smartArt: false,
    chart: false,
    themes: false,
    pictures: false,
    icons: false,
    entranceAnim: false,
    emphasisAnim: false,
    exitAnim: false,
    motionAnim: false,
  });

  const [tableGrid, setTableGrid] = useState({ rows: 1, cols: 1 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (selectedElements.length > 0) {
        if (activeTab !== 'Animations' && activeTab !== 'Format') setActiveTab('Format');
    } else {
        if (activeTab === 'Format' || activeTab === 'Animations') {
            setActiveTab('Home');
        }
    }
  }, [selectedElements, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (ribbonRef.current && !ribbonRef.current.contains(event.target as Node)) {
             setDropdowns(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as typeof prev));
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const toggleDropdown = (name: keyof typeof dropdowns, force?: boolean) => {
      setDropdowns(prev => ({
          ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as typeof prev),
          [name]: force !== undefined ? force : !prev[name]
      }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const type = event.target.dataset.type;
    if (!file || !type) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) return;
        
        if (type === 'table') {
            if (!(result instanceof ArrayBuffer)) return;
            try {
                const workbook = XLSX.read(result, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = (XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]).map(row => row.map(cell => String(cell ?? '')));

                if (data.length > 0) {
                    const rows = data.length;
                    const cols = data.reduce((max, row) => Math.max(max, row.length), 0);
                    
                    const paddedData = data.map(row => {
                        const newRow = [...row];
                        while(newRow.length < cols) newRow.push('');
                        return newRow;
                    });

                    const newTableElement: TableElement = {
                        id: uuidv4(),
                        type: ElementType.TABLE,
                        x: 100, y: 100, width: Math.max(400, cols * 120), height: Math.max(200, rows * 40), rotation: 0,
                        rows,
                        cols,
                        cellData: paddedData,
                        headerRow: true,
                        bandedRows: true,
                        themeId: 'blue',
                    };
                    onAddElement(newTableElement);
                }
            } catch (error) {
                console.error("Error parsing spreadsheet file:", error);
                alert("Could not parse the file. Please ensure it's a valid CSV or XLSX file.");
            }
            return;
        }

        if (typeof result !== 'string') return;
        
        let newElement: SlideElement | null = null;
        const commonProps = { id: uuidv4(), x: 100, y: 100, rotation: 0 };

        switch (type) {
            case 'image':
                newElement = { ...commonProps, type: ElementType.IMAGE, src: result, width: 400, height: 300, filters: { brightness: 100, contrast: 100 } } as ImageElement;
                break;
            case 'video':
                newElement = { ...commonProps, type: ElementType.VIDEO, src: result, width: 480, height: 270, autoplay: false, controls: true } as VideoElement;
                break;
            case 'audio':
                newElement = { ...commonProps, type: ElementType.AUDIO, src: result, width: 300, height: 60, autoplay: false, controls: true } as AudioElement;
                break;
            case 'icon':
                newElement = { ...commonProps, type: ElementType.ICON, svgString: result, color: '#000000', width: 100, height: 100 } as IconElement;
                break;
            case '3d':
                newElement = { ...commonProps, type: ElementType.THREED_MODEL, src: result, width: 400, height: 300 } as ThreeDModelElement;
                break;
        }

        if (newElement) onAddElement(newElement);
    };

    if (type === 'table') {
        reader.readAsArrayBuffer(file);
    } else if (type === 'icon') {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }

    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const openFileDialog = (type: 'image' | 'video' | 'audio' | 'icon' | '3d' | 'table') => {
    if (fileInputRef.current) {
        const acceptMap = {
            image: 'image/png,image/jpeg,image/gif',
            video: 'video/mp4,video/webm',
            audio: 'audio/mp3,audio/wav,audio/ogg',
            icon: 'image/svg+xml',
            '3d': '.glb,.gltf',
            table: '.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
        };
        fileInputRef.current.accept = acceptMap[type];
        fileInputRef.current.dataset.type = type;
        fileInputRef.current.click();
    }
  };
  
  const handleAddText = () => {
    const newTextElement: TextElement = {
        id: uuidv4(), type: ElementType.CONTENT, content: 'New Text Box',
        x: 150, y: 150, width: 300, height: 100, rotation: 0,
        fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left',
        fontFamily: 'Arial', color: '#000000'
    };
    onAddElement(newTextElement);
  };

  const handleAddShape = (shapeType: ShapeType) => {
      const newShapeElement: ShapeElement = {
          id: uuidv4(), type: ElementType.SHAPE, shapeType: shapeType,
          x: 200, y: 200, width: 200, height: 150, rotation: 0,
          backgroundColor: 'linear-gradient(135deg, #81cbfd 0%, #3d93fd 100%)',
          borderColor: '#ffffff',
          borderWidth: 2
      };
      onAddElement(newShapeElement);
      toggleDropdown('shapes', false);
  }

  const handleAddTable = (rows: number, cols: number) => {
    const newTableElement: TableElement = {
        id: uuidv4(),
        type: ElementType.TABLE,
        x: 100, y: 100, width: 600, height: 400, rotation: 0,
        rows,
        cols,
        cellData: Array(rows).fill(0).map(() => Array(cols).fill('')),
        headerRow: true,
        bandedRows: true,
        themeId: 'blue',
    };
    onAddElement(newTableElement);
    toggleDropdown('table', false);
  };
  
  const handleAddChart = (chartType: ChartType) => {
    let data;
    const dataKeys = ['Series 1', 'Series 2'];
    switch(chartType) {
        case ChartType.PIE:
             data = [
                { name: 'Group A', 'Series 1': 400 }, { name: 'Group B', 'Series 1': 300 },
                { name: 'Group C', 'Series 1': 300 }, { name: 'Group D', 'Series 1': 200 },
            ];
            break;
        case ChartType.SCATTER:
            data = [
                { name: 'A', 'Series 1': 100, 'Series 2': 200 }, { name: 'B', 'Series 1': 120, 'Series 2': 100 },
                { name: 'C', 'Series 1': 170, 'Series 2': 300 }, { name: 'D', 'Series 1': 140, 'Series 2': 250 },
            ];
            break;
        case ChartType.WATERFALL:
             data = [
                { name: 'Revenue', 'Series 1': 4000 }, { name: 'COGS', 'Series 1': -1200 },
                { name: 'Marketing', 'Series 1': -800 }, { name: 'Sales', 'Series 1': 3200 },
                { name: 'R&D', 'Series 1': -1500 },
            ];
            break;
        default: // Bar, Line, Radar
            data = [
                { name: 'Page A', 'Series 1': 4000, 'Series 2': 2400 },
                { name: 'Page B', 'Series 1': 3000, 'Series 2': 1398 },
                { name: 'Page C', 'Series 1': 2000, 'Series 2': 9800 },
                { name: 'Page D', 'Series 1': 2780, 'Series 2': 3908 },
                { name: 'Page E', 'Series 1': 1890, 'Series 2': 4800 },
            ];
    }

    const newChartElement: ChartElement = {
        id: uuidv4(),
        type: ElementType.CHART,
        chartType,
        x: 140, y: 110, width: 1000, height: 500, rotation: 0,
        data,
        config: {
            dataKeys,
            colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'],
            showGrid: true,
            showLegend: true,
            ...(chartType === ChartType.PIE && { labelType: 'percent' })
        }
    };
    onAddElement(newChartElement);
    toggleDropdown('chart', false);
  };

  const handleAddSmartArt = (smartArtType: SmartArtType) => {
    let data: SmartArtNode;
    let defaultWidth = 800;
    let defaultHeight = 400;

    switch(smartArtType) {
        case SmartArtType.BASIC_PYRAMID:
        case SmartArtType.INVERTED_PYRAMID:
        case SmartArtType.SEGMENTED_PYRAMID:
            data = { id: uuidv4(), text: 'Pyramid', children: [
                { id: uuidv4(), text: 'Level 1', children: [] },
                { id: uuidv4(), text: 'Level 2', children: [] },
                { id: uuidv4(), text: 'Level 3', children: [] },
            ]};
            defaultWidth = 400;
            defaultHeight = 400;
            break;
        case SmartArtType.PYRAMID_LIST:
            data = { id: uuidv4(), text: 'Pyramid List', children: [
                { id: uuidv4(), text: 'Topic 1', children: [{id: uuidv4(), text: 'Detail point', children: []}] },
                { id: uuidv4(), text: 'Topic 2', children: [{id: uuidv4(), text: 'Detail point', children: []}] },
                { id: uuidv4(), text: 'Topic 3', children: [{id: uuidv4(), text: 'Detail point', children: []}] },
            ]};
             defaultWidth = 700;
            defaultHeight = 400;
            break;
        case SmartArtType.BASIC_CHEVRON_PROCESS:
             data = { id: uuidv4(), text: 'Process', children: [
                { id: uuidv4(), text: 'Step 1', children: [] },
                { id: uuidv4(), text: 'Step 2', children: [] },
                { id: uuidv4(), text: 'Step 3', children: [] },
                { id: uuidv4(), text: 'Step 4', children: [] },
                { id: uuidv4(), text: 'Step 5', children: [] },
            ]};
            defaultWidth = 900;
            defaultHeight = 150;
            break;
        case SmartArtType.BASIC_PROCESS:
        case SmartArtType.VERTICAL_CHEVRON_LIST:
        case SmartArtType.STEP_UP_PROCESS:
        case SmartArtType.TIMELINE:
        case SmartArtType.GEARS:
        case SmartArtType.FUNNEL:
        case SmartArtType.CONTINUOUS_ARROW_PROCESS:
        case SmartArtType.ACCENT_PROCESS:
        case SmartArtType.CIRCLE_ARROW_PROCESS:
        case SmartArtType.DETAILED_PROCESS:
            data = { id: uuidv4(), text: 'Process', children: [
                { id: uuidv4(), text: 'Step 1', children: [] },
                { id: uuidv4(), text: 'Step 2', children: [] },
                { id: uuidv4(), text: 'Step 3', children: [] },
            ]};
            if (smartArtType === SmartArtType.VERTICAL_CHEVRON_LIST) {
                defaultWidth = 400;
                defaultHeight = 600;
            }
            if (smartArtType === SmartArtType.FUNNEL) {
                defaultWidth = 400;
                defaultHeight = 500;
            }
             if (smartArtType === SmartArtType.GEARS) {
                defaultWidth = 600;
                defaultHeight = 400;
            }
            if (smartArtType === SmartArtType.TIMELINE) {
                defaultHeight = 500;
            }
            if (smartArtType === SmartArtType.ACCENT_PROCESS) {
                defaultWidth = 700;
                defaultHeight = 200;
            }
            if (smartArtType === SmartArtType.CIRCLE_ARROW_PROCESS) {
                defaultWidth = 200;
                defaultHeight = 500;
            }
            if (smartArtType === SmartArtType.DETAILED_PROCESS) {
                defaultWidth = 800;
                defaultHeight = 150;
            }
            break;
        case SmartArtType.CIRCULAR_BENDING_PROCESS:
        case SmartArtType.CYCLE:
        case SmartArtType.CONTINUOUS_CYCLE:
        case SmartArtType.SEGMENTED_CYCLE:
            data = { id: uuidv4(), text: 'Cycle', children: [
                { id: uuidv4(), text: 'Phase 1', children: [] },
                { id: uuidv4(), text: 'Phase 2', children: [] },
                { id: uuidv4(), text: 'Phase 3', children: [] },
                { id: uuidv4(), text: 'Phase 4', children: [] },
            ]};
            defaultWidth = 500;
            defaultHeight = 500;
            break;
        case SmartArtType.RADIAL_CYCLE:
             data = { id: uuidv4(), text: 'Center', children: [
                { id: uuidv4(), text: 'Item 1', children: [] },
                { id: uuidv4(), text: 'Item 2', children: [] },
                { id: uuidv4(), text: 'Item 3', children: [] },
                { id: uuidv4(), text: 'Item 4', children: [] },
                { id: uuidv4(), text: 'Item 5', children: [] },
            ]};
            defaultWidth = 600;
            defaultHeight = 600;
            break;
        case SmartArtType.HIERARCHY:
        default:
            data = { id: uuidv4(), text: 'Root', children: [
                { id: uuidv4(), text: 'Child 1', children: [] },
                { id: uuidv4(), text: 'Child 2', children: [
                    { id: uuidv4(), text: 'Grandchild', children: [] }
                ] },
            ]};
            break;
    }

    const newSmartArtElement: SmartArtElement = {
        id: uuidv4(),
        type: ElementType.SMART_ART,
        x: 150, y: 150, width: defaultWidth, height: defaultHeight, rotation: 0,
        smartArtType,
        data,
        nodeColor: '#4A90E2',
        lineColor: '#64748b'
    };
    onAddElement(newSmartArtElement);
    toggleDropdown('smartArt', false);
  }
  
  const handleTransitionChange = (type: TransitionType) => {
    if (currentSlide) {
        onUpdateSlide({ transition: { type, duration: currentSlide.transition?.duration || 500 } });
    }
  };

  const handleDurationChange = (duration: number) => {
      if (currentSlide) {
          onUpdateSlide({ transition: { type: currentSlide.transition?.type || TransitionType.NONE, duration: Math.max(100, duration) } });
      }
  };
  
  const handleAddAnimation = (type: AnimationType, effect: AnimationEffect, dropdown: keyof typeof dropdowns) => {
      if (selectedElements.length === 0) return;
      const updates = selectedElements.map(element => {
          const newAnimation: Animation = {
              type,
              effect,
              trigger: element.animation?.trigger || AnimationTrigger.ON_CLICK,
              duration: element.animation?.duration || 500,
              delay: element.animation?.delay || 0
          };
          return { id: element.id, props: { animation: newAnimation } };
      });
      onUpdateElements(updates);
      toggleDropdown(dropdown, false);
  };
  
  const handleSetCustomPath = (tool: 'free' | 'line' | 'circle') => {
    if (selectedElements.length !== 1) return;
    const selectedElement = selectedElements[0];
    const newAnimation: Animation = {
        type: AnimationType.MOTION,
        effect: AnimationEffect.MOTION_CUSTOM_PATH,
        trigger: selectedElement.animation?.trigger || AnimationTrigger.ON_CLICK,
        duration: selectedElement.animation?.duration || 2000,
        delay: selectedElement.animation?.delay || 0,
        path: selectedElement.animation?.path, // Preserve existing path for combination
    };
    onUpdateElement(selectedElement.id, { animation: newAnimation });
    onSetDrawingState({ isActive: true, tool });
    toggleDropdown('motionAnim', false);
  };
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const shapeOptions = [
      { type: ShapeType.RECTANGLE, label: 'Rectangle', icon: <RectangleIcon /> },
      { type: ShapeType.OVAL, label: 'Oval', icon: <OvalIcon /> },
      { type: ShapeType.TRIANGLE, label: 'Triangle', icon: <TriangleIcon /> },
      { type: ShapeType.RIGHT_ARROW, label: 'Arrow', icon: <RightArrowIcon /> },
      { type: ShapeType.STAR_5, label: 'Star', icon: <StarIcon /> },
  ];

  const chartOptions = [
      { type: ChartType.BAR, label: 'Bar', icon: <BarChartIcon /> },
      { type: ChartType.LINE, label: 'Line', icon: <LineChartIcon /> },
      { type: ChartType.PIE, label: 'Pie', icon: <PieChartIcon /> },
      { type: ChartType.SCATTER, label: 'Scatter', icon: <ScatterChartIcon /> },
      { type: ChartType.RADAR, label: 'Radar', icon: <RadarChartIcon /> },
      { type: ChartType.WATERFALL, label: 'Waterfall', icon: <WaterfallChartIcon /> },
  ];

  const transitionOptions = [
    { type: TransitionType.NONE, label: 'None', icon: <NoTransitionIcon /> },
    { type: TransitionType.FADE, label: 'Fade', icon: <FadeIcon /> },
    { type: TransitionType.PUSH, label: 'Push', icon: <PushIcon /> },
    { type: TransitionType.WIPE, label: 'Wipe', icon: <WipeIcon /> },
    { type: TransitionType.ZOOM, label: 'Zoom', icon: <ZoomIcon /> },
    { type: TransitionType.MORPH, label: 'Morph', icon: <MorphIcon /> },
  ];

  const animationEffects = {
      [AnimationType.ENTRANCE]: [
          { effect: AnimationEffect.FADE_IN, label: 'Fade In', icon: <FadeInIcon /> },
          { effect: AnimationEffect.FLY_IN, label: 'Fly In', icon: <FlyInIcon /> },
          { effect: AnimationEffect.ZOOM_IN, label: 'Zoom In', icon: <ZoomInIcon /> },
      ],
      [AnimationType.EMPHASIS]: [
          { effect: AnimationEffect.PULSE, label: 'Pulse', icon: <PulseIcon /> },
          { effect: AnimationEffect.SPIN, label: 'Spin', icon: <SpinIcon /> },
          { effect: AnimationEffect.TADA, label: 'Tada', icon: <TadaIcon /> },
      ],
      [AnimationType.EXIT]: [
          { effect: AnimationEffect.FADE_OUT, label: 'Fade Out', icon: <FadeInIcon /> },
          { effect: AnimationEffect.FLY_OUT, label: 'Fly Out', icon: <FlyInIcon /> },
          { effect: AnimationEffect.ZOOM_OUT, label: 'Zoom Out', icon: <ZoomInIcon /> },
      ],
      [AnimationType.MOTION]: [
        { effect: AnimationEffect.MOTION_LINE_RIGHT, label: 'Line Right', icon: <LineRightIcon /> },
        { effect: AnimationEffect.MOTION_LINE_DOWN, label: 'Line Down', icon: <LineDownIcon /> },
        { effect: AnimationEffect.MOTION_DIAGONAL_DOWN_RIGHT, label: 'Diagonal', icon: <DiagonalDownRightIcon /> },
      ]
  };
  
  const smartArtCategories = {
    'Hierarchy': [
        { type: SmartArtType.HIERARCHY, label: 'Hierarchy', icon: <HierarchyIcon /> },
    ],
    'Process': [
        { type: SmartArtType.BASIC_PROCESS, label: 'Basic Process', icon: <BasicProcessIcon /> },
        { type: SmartArtType.BASIC_CHEVRON_PROCESS, label: 'Chevron Process', icon: <BasicChevronProcessIcon /> },
        { type: SmartArtType.CONTINUOUS_ARROW_PROCESS, label: 'Arrow Process', icon: <ContinuousArrowProcessIcon /> },
        { type: SmartArtType.DETAILED_PROCESS, label: 'Detailed Process', icon: <DetailedProcessIcon /> },
        { type: SmartArtType.ACCENT_PROCESS, label: 'Accent Process', icon: <AccentProcessIcon /> },
        { type: SmartArtType.CIRCLE_ARROW_PROCESS, label: 'Circle Arrow Process', icon: <CircleArrowProcessIcon /> },
        { type: SmartArtType.TIMELINE, label: 'Timeline', icon: <TimelineIcon /> },
        { type: SmartArtType.FUNNEL, label: 'Funnel', icon: <FunnelIcon /> },
        { type: SmartArtType.GEARS, label: 'Gears', icon: <GearsIcon /> },
        { type: SmartArtType.VERTICAL_CHEVRON_LIST, label: 'Chevron List', icon: <VerticalChevronIcon /> },
        { type: SmartArtType.STEP_UP_PROCESS, label: 'Step-Up', icon: <StepUpIcon /> },
    ],
    'Cycle': [
        { type: SmartArtType.CYCLE, label: 'Text Cycle', icon: <CycleIcon /> },
        { type: SmartArtType.CONTINUOUS_CYCLE, label: 'Continuous Cycle', icon: <ContinuousCycleIcon /> },
        { type: SmartArtType.SEGMENTED_CYCLE, label: 'Segmented Cycle', icon: <SegmentedCycleIcon /> },
        { type: SmartArtType.RADIAL_CYCLE, label: 'Radial Cycle', icon: <RadialCycleIcon /> },
        { type: SmartArtType.CIRCULAR_BENDING_PROCESS, label: 'Bending Process', icon: <CircularBendingIcon /> },
    ],
    'Pyramid': [
        { type: SmartArtType.BASIC_PYRAMID, label: 'Basic Pyramid', icon: <BasicPyramidIcon /> },
        { type: SmartArtType.INVERTED_PYRAMID, label: 'Inverted Pyramid', icon: <InvertedPyramidIcon /> },
        { type: SmartArtType.PYRAMID_LIST, label: 'Pyramid List', icon: <PyramidListIcon /> },
        { type: SmartArtType.SEGMENTED_PYRAMID, label: 'Segmented Pyramid', icon: <SegmentedPyramidIcon /> },
    ]
  };

  const ThemePreview: React.FC<{ theme: Theme }> = ({ theme }) => {
    return (
        <div className="w-full h-full flex flex-col" style={{ background: theme.colors.background }}>
            <div className="flex-1 p-2 flex items-start justify-center">
                <div style={{ color: theme.colors.text, fontFamily: theme.fonts.heading, fontSize: '0.8rem', fontWeight: 'bold' }}>Title</div>
            </div>
            <div className="flex-shrink-0 h-1/3 flex items-center justify-evenly p-1">
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.primary }}></div>
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.secondary }}></div>
                <div className="w-4 h-4 rounded-full" style={{ background: theme.colors.accent }}></div>
            </div>
        </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'File':
        return (
            <div className="flex space-x-1 h-full">
                <div className="p-2 border-r border-gray-300 flex items-end space-x-2">
                    <button onClick={() => setIsApiKeyModalOpen(true)} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                        <KeyIcon />
                        <span className="text-xs">Set API Key</span>
                    </button>
                    <button onClick={onExportToPptx} disabled={isExporting} className="flex flex-col items-center justify-start p-2 rounded hover:bg-gray-200 disabled:opacity-75 disabled:cursor-not-allowed">
                        <div className="h-5 w-5 flex items-center justify-center">
                          {isExporting ? <div className="text-gray-700"><LoadingSpinner /></div> : <ExportIcon />}
                        </div>
                        <span className="text-xs">{isExporting ? 'Exporting...' : 'Export to .pptx'}</span>
                    </button>
                    <button onClick={onExportToPdf} className="flex flex-col items-center justify-start p-2 rounded hover:bg-gray-200">
                        <div className="h-5 w-5 flex items-center justify-center">
                            <PdfIcon />
                        </div>
                        <span className="text-xs">Export to .pdf</span>
                    </button>
                </div>
            </div>
        );
      case 'Home':
        return (
          <div className="flex space-x-1 h-full">
            <div className="p-2 border-r border-gray-300 flex items-end space-x-2">
                <button onClick={onUndo} disabled={!canUndo} className="flex flex-col items-center p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  <UndoIcon />
                  <span className="text-xs">Undo</span>
                </button>
                <button onClick={onRedo} disabled={!canRedo} className="flex flex-col items-center p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  <RedoIcon />
                  <span className="text-xs">Redo</span>
                </button>
            </div>
            <div className="p-2 border-r border-gray-300 flex items-end space-x-2">
                <button onClick={onNewSlide} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                  <NewSlideIcon />
                  <span className="text-xs">New Slide</span>
                </button>
            </div>
             <div className="p-2 border-r border-gray-300 flex items-end space-x-2">
                <button onClick={onToggleAIAssistant} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                  <AIAssistantIcon />
                  <span className="text-xs">AI Assistant</span>
                </button>
            </div>
          </div>
        );
      case 'Insert':
        return (
            <div className="flex space-x-1 h-full">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className="p-2 border-r border-gray-300 flex items-end space-x-2">
                    <button onClick={handleAddText} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                      <TextBoxIcon />
                      <span className="text-xs">Text Box</span>
                    </button>
                     <div className="relative">
                        <button onClick={() => toggleDropdown('table')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                            <TableIcon />
                            <span className="text-xs">Table</span>
                        </button>
                        {dropdowns.table && (
                            <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 p-2">
                                <div onMouseLeave={() => setTableGrid({rows: 1, cols: 1})}>
                                    <p className="text-center text-sm mb-2">{tableGrid.cols} x {tableGrid.rows} Table</p>
                                    <div className="grid grid-cols-8 gap-1">
                                        {Array.from({ length: 8 * 5 }).map((_, i) => {
                                            const r = Math.floor(i / 8) + 1;
                                            const c = (i % 8) + 1;
                                            const isSelected = r <= tableGrid.rows && c <= tableGrid.cols;
                                            return (
                                                <div key={i}
                                                    onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
                                                    onClick={() => handleAddTable(r, c)}
                                                    className={`w-5 h-5 border cursor-pointer ${isSelected ? 'bg-blue-400 border-blue-600' : 'bg-gray-200 border-gray-400'}`}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="pt-2 mt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            openFileDialog('table');
                                            toggleDropdown('table', false);
                                        }}
                                        className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                    >
                                        Import from File...
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="relative">
                        <button onClick={() => toggleDropdown('chart')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                          <ChartIcon />
                          <span className="text-xs">Chart</span>
                        </button>
                        {dropdowns.chart && (
                            <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-48 p-2">
                                <div className="grid grid-cols-2 gap-1">
                                    {chartOptions.map(opt => (
                                        <button 
                                            key={opt.type} 
                                            onClick={() => handleAddChart(opt.type)}
                                            className="flex flex-col items-center p-2 rounded hover:bg-gray-100 text-center"
                                            title={opt.label}
                                        >
                                            <div className="h-8 w-8 flex items-center justify-center">{opt.icon}</div>
                                            <span className="text-xs leading-tight mt-1">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-2 border-r border-gray-300">
                    <p className="text-xs text-center text-gray-600 mb-1">Illustrations</p>
                    <div className="flex items-end space-x-2">
                         <div className="relative">
                            <button onClick={() => toggleDropdown('shapes')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                              <ShapesIcon />
                              <span className="text-xs">Shapes</span>
                            </button>
                            {dropdowns.shapes && (
                                <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-36">
                                    {shapeOptions.map(opt => (
                                        <button key={opt.type} onClick={() => handleAddShape(opt.type)} className="flex items-center space-x-2 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            {opt.icon}<span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button onClick={() => toggleDropdown('smartArt')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                                <SmartArtIcon />
                                <span className="text-xs">SmartArt</span>
                            </button>
                            {dropdowns.smartArt && (
                                <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 p-2 w-80 max-h-80 overflow-y-auto">
                                    {Object.entries(smartArtCategories).map(([category, options]) => (
                                        <div key={category}>
                                            <p className="text-xs font-bold text-gray-500 px-1 pt-2 pb-1">{category}</p>
                                            <div className="grid grid-cols-4 gap-1">
                                                {options.map(opt => (
                                                    <button 
                                                        key={opt.type} 
                                                        onClick={() => handleAddSmartArt(opt.type)}
                                                        className="flex flex-col items-center p-2 rounded hover:bg-gray-100 text-center"
                                                        title={opt.label}
                                                    >
                                                        <div className="h-8 w-8 flex items-center justify-center">{opt.icon}</div>
                                                        <span className="text-xs leading-tight mt-1">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button onClick={() => toggleDropdown('icons')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                                <SvgIcon />
                                <span className="text-xs">Icons</span>
                            </button>
                            {dropdowns.icons && (
                                <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-48 p-1">
                                    <button
                                        onClick={() => { openFileDialog('icon'); toggleDropdown('icons', false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                    >
                                        <span>From Device...</span>
                                    </button>
                                    <button
                                        onClick={() => { onToggleIconSearch(); toggleDropdown('icons', false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                    >
                                        <SearchIcon />
                                        <span>Search Web...</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <div className="p-2 border-r border-gray-300">
                    <p className="text-xs text-center text-gray-600 mb-1">Media</p>
                    <div className="flex items-end space-x-2">
                        <div className="relative">
                          <button onClick={() => toggleDropdown('pictures')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                            <PicturesIcon />
                            <span className="text-xs">Pictures</span>
                          </button>
                          {dropdowns.pictures && (
                              <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-48 p-1">
                                  <button
                                      onClick={() => { openFileDialog('image'); toggleDropdown('pictures', false); }}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                  >
                                      <span>From Device...</span>
                                  </button>
                                  <button
                                      onClick={() => { onToggleImageSearch(); toggleDropdown('pictures', false); }}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                  >
                                      <SearchIcon />
                                      <span>Search Web...</span>
                                  </button>
                              </div>
                          )}
                        </div>
                        <button onClick={onToggleGifSearch} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                          <GifIcon />
                          <span className="text-xs">GIF</span>
                        </button>
                         <button onClick={() => openFileDialog('video')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                          <VideoIcon />
                          <span className="text-xs">Video</span>
                        </button>
                         <button onClick={() => openFileDialog('audio')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                          <AudioIcon />
                          <span className="text-xs">Audio</span>
                        </button>
                        <button onClick={() => openFileDialog('3d')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                          <ThreeDIcon />
                          <span className="text-xs">3D Models</span>
                        </button>
                    </div>
                </div>
            </div>
        );
      case 'Design':
        return (
            <div className="flex space-x-1 h-full">
                <div className="p-2 border-r border-gray-300 flex flex-col items-center justify-center relative">
                    <button onClick={() => toggleDropdown('themes')} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                      <DesignIdeasIcon />
                    </button>
                    <p className="text-xs text-center text-gray-600 mt-1">Themes</p>
                     {dropdowns.themes && (
                        <div className="absolute z-20 top-full mt-2 bg-white shadow-lg rounded-md border border-gray-200 p-2 w-72 max-h-80 overflow-y-auto left-0">
                            <p className="text-sm font-semibold mb-2 text-gray-800 px-2">Presentation Themes</p>
                            <div className="grid grid-cols-2 gap-2">
                                {themes.map((theme) => (
                                <div key={theme.id}>
                                        <p className="text-xs font-medium text-gray-700 mb-1 truncate px-1">{theme.name}</p>
                                        <button 
                                            onClick={() => {
                                                onSetTheme(theme.id);
                                                toggleDropdown('themes', false);
                                            }}
                                            className="w-full block border-2 border-gray-200 hover:border-slate-700 focus:border-slate-800 focus:outline-none transition-all rounded-md overflow-hidden shadow-sm aspect-[16/9]"
                                            aria-label={`Select ${theme.name} theme`}
                                        >
                                            <ThemePreview theme={theme} />
                                        </button>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                 <div className="p-2 border-r border-gray-300 flex items-center justify-center space-x-4">
                    <div className="flex flex-col items-center">
                      <ColorPicker value={currentSlide?.backgroundColor || '#FFFFFF'} onChange={color => onUpdateSlide({ backgroundColor: color })} />
                      <span className="text-xs mt-1">Background</span>
                    </div>
                     <button onClick={() => onUpdateSlide({ backgroundImage: undefined })} className="text-xs text-blue-600 hover:underline self-start mt-2">Clear BG Image</button>
                </div>
                 <div className="p-2 border-r border-gray-300 flex items-center justify-center">
                     <div className="flex flex-col items-center">
                        <ColorPicker value={canvasColor} onChange={onCanvasColorChange} />
                         <span className="text-xs mt-1">Canvas</span>
                    </div>
                </div>
            </div>
        );
       case 'Transitions':
        const activeTransitionType = currentSlide?.transition?.type || TransitionType.NONE;
        return (
            <div className="flex space-x-1 h-full items-center">
                <div className="p-2 border-r border-gray-300 h-full flex items-center">
                    <div className="flex flex-col items-center">
                         <div className="flex items-center space-x-1">
                            {transitionOptions.map(opt => (
                                <button
                                    key={opt.type}
                                    onClick={() => handleTransitionChange(opt.type)}
                                    className={`p-1 rounded flex flex-col items-center w-16 ${activeTransitionType === opt.type ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                                    title={opt.label}
                                >
                                    <div className="h-8 w-8 flex items-center justify-center text-gray-700">{opt.icon}</div>
                                    <span className="text-xs mt-1">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-center text-gray-600 mt-1">Transition to This Slide</p>
                    </div>
                </div>
                 {activeTransitionType !== TransitionType.NONE && (
                     <>
                        <div className="p-2 border-r border-gray-300 h-full flex flex-col justify-center">
                            <label className="flex flex-col items-center">
                                <span className="text-xs mb-1">Duration (ms)</span>
                                <input
                                    type="number"
                                    step="100"
                                    min="100"
                                    value={currentSlide?.transition?.duration || 500}
                                    onChange={e => handleDurationChange(parseInt(e.target.value, 10))}
                                    className="w-24 h-8 px-2 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </label>
                            <p className="text-xs text-center text-gray-600 mt-2">Timing</p>
                        </div>
                        <div className="p-2 border-r border-gray-300 h-full flex flex-col justify-center">
                            <button
                                onClick={onApplyTransitionToAll}
                                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
                                title="Apply the current transition and duration to all slides in the presentation."
                            >
                                Apply to All
                            </button>
                            <p className="text-xs text-center text-gray-600 mt-2">Effect Options</p>
                        </div>
                     </>
                )}
            </div>
        );
    case 'Animations':
        if (selectedElements.length === 0) {
            return <div className="p-4 text-sm text-gray-500 flex items-center">Select an object to apply an animation.</div>;
        }
        return (
            <div className="flex space-x-1 h-full items-center">
                <div className="p-2 border-r border-gray-300 h-full flex items-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2">
                             <div className="relative">
                                <button onClick={() => toggleDropdown('entranceAnim')} className="px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm font-semibold">Entrance</button>
                                {dropdowns.entranceAnim && (
                                    <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-40 p-1">
                                        {animationEffects.ENTRANCE.map(opt => (
                                            <button key={opt.effect} onClick={() => handleAddAnimation(AnimationType.ENTRANCE, opt.effect, 'entranceAnim')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                                {opt.icon}<span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button onClick={() => toggleDropdown('emphasisAnim')} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-sm font-semibold">Emphasis</button>
                                {dropdowns.emphasisAnim && (
                                    <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-40 p-1">
                                        {animationEffects.EMPHASIS.map(opt => (
                                            <button key={opt.effect} onClick={() => handleAddAnimation(AnimationType.EMPHASIS, opt.effect, 'emphasisAnim')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                                {opt.icon}<span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                             <div className="relative">
                                <button onClick={() => toggleDropdown('exitAnim')} className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-semibold">Exit</button>
                                 {dropdowns.exitAnim && (
                                    <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-40 p-1">
                                        {animationEffects.EXIT.map(opt => (
                                            <button key={opt.effect} onClick={() => handleAddAnimation(AnimationType.EXIT, opt.effect, 'exitAnim')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                                {opt.icon}<span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                             <div className="relative">
                                <button onClick={() => toggleDropdown('motionAnim')} disabled={selectedElements.length > 1} className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                  <MotionPathIcon /> <span>Motion Paths</span>
                                </button>
                                 {dropdowns.motionAnim && (
                                    <div className="absolute z-20 top-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-44 p-1">
                                        {animationEffects.MOTION.map(opt => (
                                            <button key={opt.effect} onClick={() => handleAddAnimation(AnimationType.MOTION, opt.effect, 'motionAnim')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                                {opt.icon}<span>{opt.label}</span>
                                            </button>
                                        ))}
                                        <div className="border-t my-1"></div>
                                        <button onClick={() => handleSetCustomPath('free')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                            <CustomPathIcon />
                                            <span>Free Draw</span>
                                        </button>
                                        <button onClick={() => handleSetCustomPath('line')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                            <LinePathIcon />
                                            <span>Line Path</span>
                                        </button>
                                        <button onClick={() => handleSetCustomPath('circle')} className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 rounded">
                                            <CirclePathIcon />
                                            <span>Circle Path</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-center text-gray-600 mt-1">Animation</p>
                    </div>
                </div>
                 <div className="p-2 border-r border-gray-300 h-full flex items-center">
                      <button onClick={onToggleAnimationPane} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                        <AnimationPaneIcon />
                        <span className="text-xs">Animation Pane</span>
                    </button>
                </div>
            </div>
        );
      case 'Slide Show':
        return (
            <div className="flex space-x-1">
                <div className="p-2 border-r border-gray-300">
                    <p className="text-xs text-center text-gray-600 mb-1">Start Slide Show</p>
                    <button onClick={onPresent} className="flex flex-col items-center p-2 rounded hover:bg-gray-200">
                      <SlideShowIcon />
                      <span className="text-xs">From Beginning</span>
                    </button>
                </div>
            </div>
        );
      case 'Format':
        return selectedElements.length > 0 ? <FormatToolbar selectedElements={selectedElements} onUpdateElement={onUpdateElement} onUpdateElements={onUpdateElements} onUpdateElementsLayer={onUpdateElementsLayer} onAlignElements={onAlignElements} onGroupElements={onGroupElements} onUngroupElements={onUngroupElements} onOpenChartEditor={onOpenChartEditor} /> : null;
      default:
        return <div className="p-4 text-sm text-gray-500">Features for {activeTab} are coming soon.</div>;
    }
  };

  const baseTabs: Tab[] = ['File', 'Home', 'Insert', 'Design', 'Transitions', 'Animations', 'Slide Show'];
  const tabs: Tab[] = selectedElements.length > 0 ? [...baseTabs, 'Format'] : baseTabs;

  return (
    <div id="app-ribbon" className="text-gray-800 shadow-md" ref={ribbonRef}>
      <div className="px-4 bg-slate-800 text-white">
         <div className="flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm transition-colors ${activeTab === tab ? 'bg-gray-100 text-gray-800 rounded-t-md' : 'hover:bg-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 h-[88px] flex items-center bg-gray-100">{renderTabContent()}</div>
      {isApiKeyModalOpen && (
        <ApiKeyModal
            onClose={() => setIsApiKeyModalOpen(false)}
            onSave={(keys) => {
                onSaveApiKeys(keys);
                setIsApiKeyModalOpen(false);
            }}
        />
      )}
    </div>
  );
};

export default Ribbon;