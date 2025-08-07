export enum ElementType {
  TITLE = 'TITLE',
  SUBTITLE = 'SUBTITLE',
  CONTENT = 'CONTENT',
  IMAGE = 'IMAGE',
  SHAPE = 'SHAPE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ICON = 'ICON',
  THREED_MODEL = 'THREED_MODEL',
  TABLE = 'TABLE',
  SMART_ART = 'SMART_ART',
  CHART = 'CHART',
  GROUP = 'GROUP',
}

export enum ShapeType {
    RECTANGLE = 'RECTANGLE',
    OVAL = 'OVAL',
    TRIANGLE = 'TRIANGLE',
    RIGHT_ARROW = 'RIGHT_ARROW',
    STAR_5 = 'STAR_5',
}

export enum SmartArtType {
    HIERARCHY = 'HIERARCHY',
    // Process Types
    BASIC_PROCESS = 'BASIC_PROCESS',
    BASIC_CHEVRON_PROCESS = 'BASIC_CHEVRON_PROCESS',
    VERTICAL_CHEVRON_LIST = 'VERTICAL_CHEVRON_LIST',
    STEP_UP_PROCESS = 'STEP_UP_PROCESS',
    CONTINUOUS_ARROW_PROCESS = 'CONTINUOUS_ARROW_PROCESS',
    TIMELINE = 'TIMELINE',
    FUNNEL = 'FUNNEL',
    GEARS = 'GEARS',
    ACCENT_PROCESS = 'ACCENT_PROCESS',
    CIRCLE_ARROW_PROCESS = 'CIRCLE_ARROW_PROCESS',
    DETAILED_PROCESS = 'DETAILED_PROCESS',
    // Cycle Types
    CYCLE = 'CYCLE',
    CIRCULAR_BENDING_PROCESS = 'CIRCULAR_BENDING_PROCESS',
    CONTINUOUS_CYCLE = 'CONTINUOUS_CYCLE',
    SEGMENTED_CYCLE = 'SEGMENTED_CYCLE',
    RADIAL_CYCLE = 'RADIAL_CYCLE',
    // Relationship Types
    RELATIONSHIP = 'RELATIONSHIP',
    // Pyramid Types
    BASIC_PYRAMID = 'BASIC_PYRAMID',
    INVERTED_PYRAMID = 'INVERTED_PYRAMID',
    PYRAMID_LIST = 'PYRAMID_LIST',
    SEGMENTED_PYRAMID = 'SEGMENTED_PYRAMID',
}

export enum ChartType {
    BAR = 'BAR',
    LINE = 'LINE',
    PIE = 'PIE',
    RADAR = 'RADAR',
    SCATTER = 'SCATTER',
    WATERFALL = 'WATERFALL',
}

export enum TransitionType {
    NONE = 'NONE',
    FADE = 'FADE',
    PUSH = 'PUSH',
    WIPE = 'WIPE',
    ZOOM = 'ZOOM',
    MORPH = 'MORPH'
}

export enum AnimationType {
    ENTRANCE = 'ENTRANCE',
    EMPHASIS = 'EMPHASIS',
    EXIT = 'EXIT',
    MOTION = 'MOTION',
}

export enum AnimationEffect {
    // Entrance
    FADE_IN = 'FADE_IN',
    FLY_IN = 'FLY_IN',
    ZOOM_IN = 'ZOOM_IN',
    // Emphasis
    PULSE = 'PULSE',
    SPIN = 'SPIN',
    TADA = 'TADA',
    // Exit
    FADE_OUT = 'FADE_OUT',
    FLY_OUT = 'FLY_OUT',
    ZOOM_OUT = 'ZOOM_OUT',
    // Motion Paths
    MOTION_LINE_RIGHT = 'MOTION_LINE_RIGHT',
    MOTION_LINE_DOWN = 'MOTION_LINE_DOWN',
    MOTION_DIAGONAL_DOWN_RIGHT = 'MOTION_DIAGONAL_DOWN_RIGHT',
    MOTION_CUSTOM_PATH = 'MOTION_CUSTOM_PATH',
}

export enum AnimationTrigger {
    ON_CLICK = 'ON_CLICK',
    WITH_PREVIOUS = 'WITH_PREVIOUS',
    AFTER_PREVIOUS = 'AFTER_PREVIOUS',
}

export interface Animation {
    type: AnimationType;
    effect: AnimationEffect;
    trigger: AnimationTrigger;
    duration: number; // in milliseconds
    delay: number; // in milliseconds
    path?: string; // For custom motion paths (SVG path data)
}

export interface ThemeColors {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  canvas: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  aiPrompt?: string; // Optional prompt for AI to follow specific design styles
}

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  animation?: Animation;
}

export interface TextElement extends BaseElement {
  type: ElementType.TITLE | ElementType.SUBTITLE | ElementType.CONTENT;
  content: string; // This will now store HTML content
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  color: string;
  textShadow?: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textStroke?: {
    enabled: boolean;
    width: number;
    color: string;
  };
}

export interface ImageElement extends BaseElement {
    type: ElementType.IMAGE;
    src: string;
    filters: {
        brightness: number; // percentage
        contrast: number; // percentage
    };
}

export interface ShapeElement extends BaseElement {
    type: ElementType.SHAPE;
    shapeType: ShapeType;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
}

export interface VideoElement extends BaseElement {
    type: ElementType.VIDEO;
    src: string;
    autoplay: boolean;
    controls: boolean;
}

export interface AudioElement extends BaseElement {
    type: ElementType.AUDIO;
    src: string;
    autoplay: boolean;
    controls: boolean;
}

export interface IconElement extends BaseElement {
    type: ElementType.ICON;
    svgString: string;
    color: string; // fill color
}

export interface ThreeDModelElement extends BaseElement {
    type: ElementType.THREED_MODEL;
    src: string;
}

export interface TableTheme {
  id: string;
  name: string;
  headerBackground: string;
  headerColor: string;
  bandedRowBackground: string;
  cellColor: string;
  borderColor: string;
}

export const tableThemes: TableTheme[] = [
  {
    id: 'blue',
    name: 'Blue',
    headerBackground: '#4A90E2',
    headerColor: '#FFFFFF',
    bandedRowBackground: '#EAF2FA',
    cellColor: '#000000',
    borderColor: '#C2D9F2',
  },
  {
    id: 'gray',
    name: 'Gray',
    headerBackground: '#6C757D',
    headerColor: '#FFFFFF',
    bandedRowBackground: '#F8F9FA',
    cellColor: '#212529',
    borderColor: '#DEE2E6',
  },
  {
    id: 'green',
    name: 'Green',
    headerBackground: '#198754',
    headerColor: '#FFFFFF',
    bandedRowBackground: '#D1E7DD',
    cellColor: '#000000',
    borderColor: '#A3CFBB',
  },
  {
    id: 'orange',
    name: 'Orange',
    headerBackground: '#FD7E14',
    headerColor: '#FFFFFF',
    bandedRowBackground: '#FFF3E8',
    cellColor: '#000000',
    borderColor: '#FFDAB8',
  },
  {
    id: 'lines',
    name: 'Lines',
    headerBackground: '#FFFFFF',
    headerColor: '#000000',
    bandedRowBackground: '#FFFFFF',
    cellColor: '#000000',
    borderColor: '#ADB5BD',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    headerBackground: '#FFFFFF',
    headerColor: '#000000',
    bandedRowBackground: '#F8F9FA',
    cellColor: '#000000',
    borderColor: 'transparent',
  }
];

export const getTableThemeById = (id: string): TableTheme => {
    return tableThemes.find(t => t.id === id) || tableThemes[0];
};

export interface TableElement extends BaseElement {
    type: ElementType.TABLE;
    rows: number;
    cols: number;
    cellData: string[][]; // Holds HTML content
    headerRow: boolean;
    bandedRows: boolean;
    themeId: string;
}

export interface SmartArtNode {
    id: string;
    text: string;
    children: SmartArtNode[];
}

export interface SmartArtElement extends BaseElement {
    type: ElementType.SMART_ART;
    smartArtType: SmartArtType;
    data: SmartArtNode; // Using a root node structure
    nodeColor: string;
    lineColor: string;
}

export interface ChartDataPoint {
    name: string;
    [key: string]: number | string;
}

export interface ChartElement extends BaseElement {
  type: ElementType.CHART;
  chartType: ChartType;
  data: ChartDataPoint[];
  config: {
    dataKeys: string[];
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    labelType?: 'percent' | 'value' | 'name';
    seriesName?: string;
  };
}

export interface GroupElement extends BaseElement {
    type: ElementType.GROUP;
    children: SlideElement[];
}


export type SlideElement = TextElement | ImageElement | ShapeElement | VideoElement | AudioElement | IconElement | ThreeDModelElement | TableElement | SmartArtElement | ChartElement | GroupElement;

export interface Slide {
  id: string;
  elements: SlideElement[];
  notes: string;
  backgroundImage?: string;
  backgroundColor: string;
  transition?: {
    type: TransitionType;
    duration: number; // in milliseconds
  };
}

// --- THEME DEFINITIONS ---

export const aiDesignerTheme: Theme = {
  id: 'ai-designer',
  name: 'AI Designer (Creative)',
  colors: {
    background: '#F3F4F6',
    primary: '#4F46E5',
    secondary: '#10B981',
    text: '#111827',
    accent: '#F59E0B',
    canvas: '#E5E7EB',
  },
  fonts: {
    heading: 'Montserrat',
    body: 'Arial',
  },
};

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Light',
  colors: {
    background: '#FFFFFF',
    primary: '#4A90E2',
    secondary: '#50E3C2',
    text: '#000000',
    accent: '#F5A623',
    canvas: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
  }
};

export const hexagonTheme: Theme = {
  id: 'hexagon-corporate',
  name: 'Corporate Hexagon',
  colors: {
    background: '#0F213A',
    primary: '#D45D29', // Burnt Orange
    secondary: '#A9C2D7', // Light Blue
    text: '#FFFFFF',
    accent: '#D8E3EC', // Lighter blue/grey
    canvas: '#0F213A',
  },
  fonts: {
    heading: 'Montserrat',
    body: 'Montserrat',
  },
  aiPrompt: "When using this theme, extensively use hexagonal shapes as decorative elements and for image masks. The overall style should be modern, clean, and corporate. Use the provided color palette strictly."
};

export const themes: Theme[] = [
  aiDesignerTheme,
  defaultTheme,
  hexagonTheme
];

export const getThemeById = (id: string): Theme => {
  return themes.find(t => t.id === id) || defaultTheme;
};