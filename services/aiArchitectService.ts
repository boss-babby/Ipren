import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { Slide, SlideElement, ElementType, TextElement, ShapeElement, TableElement, SmartArtElement, ImageElement, SmartArtNode, ShapeType, SmartArtType, Theme, ChartElement, ChartType, TransitionType, Animation, IconElement } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

let unsplashApiKey: string | null = process.env.UNSPLASH_API_KEY || null;
let pexelsApiKey: string | null = process.env.PEXELS_API_KEY || null;
let pixabayApiKey: string | null = process.env.PIXABAY_API_KEY || null;
let giphyApiKey: string | null = process.env.GIPHY_API_KEY || null;
let tenorApiKey: string | null = process.env.TENOR_API_KEY || null;


export const setUnsplashApiKey = (key: string | null) => {
    unsplashApiKey = key;
};

export const setPexelsApiKey = (key: string | null) => {
    pexelsApiKey = key;
};

export const setPixabayApiKey = (key: string | null) => {
    pixabayApiKey = key;
};

export const setGiphyApiKey = (key: string | null) => {
    giphyApiKey = key;
};

export const setTenorApiKey = (key: string | null) => {
    tenorApiKey = key;
};

export const isUnsplashConfigured = () => !!unsplashApiKey;
export const isPexelsConfigured = () => !!pexelsApiKey;
export const isPixabayConfigured = () => !!pixabayApiKey;
export const isGiphyConfigured = () => !!giphyApiKey;
export const isTenorConfigured = () => !!tenorApiKey;


export interface ImageSearchResult {
    id: string;
    urls: { regular: string; thumb: string; };
    alt_description: string;
    size?: number; // in bytes
}

export interface GifSearchResult {
    id: string;
    url: string;
    previewUrl: string;
    alt: string;
}

export interface PaginatedGifResults {
    results: GifSearchResult[];
    next?: string; // Can be offset for Giphy or pos for Tenor
}

export interface FilePart {
    mimeType: string;
    data: string; // base64 encoded string
}

export interface SlideOutline {
    title: string;
    contentPrompt: string;
}

export const searchUnsplashImages = async (query: string): Promise<ImageSearchResult[]> => {
    if (!unsplashApiKey) {
        throw new Error("Unsplash API Key not set. Please set it via the File > Set API Key menu.");
    }
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&client_id=${unsplashApiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch from Unsplash: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results;
};

export const searchPexelsImages = async (query: string): Promise<ImageSearchResult[]> => {
    if (!pexelsApiKey) {
        throw new Error("Pexels API Key not set.");
    }
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`, {
        headers: {
            Authorization: pexelsApiKey,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch from Pexels: ${response.statusText}`);
    }
    const data = await response.json();
    return data.photos.map((photo: any) => ({
        id: photo.id.toString(),
        urls: {
            regular: photo.src.large2x,
            thumb: photo.src.medium,
        },
        alt_description: photo.alt,
    }));
};

export const searchPixabayImages = async (query: string): Promise<ImageSearchResult[]> => {
    if (!pixabayApiKey) {
        throw new Error("Pixabay API Key not set.");
    }
    const response = await fetch(`https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(query)}&per_page=20&orientation=horizontal&image_type=photo`);
    if (!response.ok) {
        throw new Error(`Failed to fetch from Pixabay: ${response.statusText}`);
    }
    const data = await response.json();
    return data.hits.map((hit: any) => ({
        id: hit.id.toString(),
        urls: {
            regular: hit.largeImageURL,
            thumb: hit.webformatURL,
        },
        alt_description: hit.tags,
    }));
};


const stripHtmlForWikimedia = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export const searchWikimediaImages = async (query: string): Promise<ImageSearchResult[]> => {
    try {
        // 1. Search for image titles
        const searchUrl = new URL('https://commons.wikimedia.org/w/api.php');
        searchUrl.search = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: query,
            srnamespace: '6', // File namespace
            srlimit: '20',
            format: 'json',
            origin: '*',
        }).toString();

        const searchResponse = await fetch(searchUrl.toString());
        if (!searchResponse.ok) throw new Error('Wikimedia search API failed.');
        const searchData = await searchResponse.json();

        const titles = searchData.query?.search?.map((item: any) => item.title);
        if (!titles || titles.length === 0) return [];

        // 2. Get image info for the titles
        const infoUrl = new URL('https://commons.wikimedia.org/w/api.php');
        infoUrl.search = new URLSearchParams({
            action: 'query',
            titles: titles.join('|'),
            prop: 'imageinfo',
            iiprop: 'url|extmetadata|size',
            iiurlwidth: '400', // Request a 400px wide thumbnail
            format: 'json',
            origin: '*',
        }).toString();

        const infoResponse = await fetch(infoUrl.toString());
        if (!infoResponse.ok) throw new Error('Wikimedia image info API failed.');
        const infoData = await infoResponse.json();

        const pages = infoData.query?.pages;
        if (!pages) return [];
        
        // 3. Map results to the common format
        const results: ImageSearchResult[] = Object.values(pages)
            .map((page: any): ImageSearchResult | null => {
                if (!page.imageinfo || !page.imageinfo[0]) return null;
                const imageInfo = page.imageinfo[0];
                const metadata = imageInfo.extmetadata;

                const description = metadata?.ImageDescription?.value 
                    ? stripHtmlForWikimedia(metadata.ImageDescription.value) 
                    : page.title.replace('File:', '').replace(/\.[^/.]+$/, "");

                let regularUrl = imageInfo.url;
                const originalSize = imageInfo.size; // Size in bytes
                const MAX_SIZE = 4 * 1024 * 1024; // 4MB

                if (originalSize && originalSize > MAX_SIZE) {
                    // Construct a URL for a scaled-down version (e.g., 1920px wide)
                    const urlParts = imageInfo.url.split('/commons/');
                    if (urlParts.length === 2) {
                        const filename = imageInfo.url.substring(imageInfo.url.lastIndexOf('/') + 1);
                        regularUrl = `${urlParts[0]}/commons/thumb/${urlParts[1]}/${1920}px-${filename}`;
                    }
                }

                return {
                    id: page.pageid.toString(),
                    urls: {
                        thumb: imageInfo.thumburl,
                        regular: regularUrl,
                    },
                    alt_description: description,
                    size: originalSize, // Add original size to the result
                };
            })
            .filter((item): item is ImageSearchResult => item !== null);

        return results;

    } catch (error) {
        console.error('Error searching Wikimedia Commons:', error);
        throw error;
    }
};

export interface IconifyInfo {
    prefix: string;
    name: string;
}

export const searchIconifyIcons = async (query: string): Promise<IconifyInfo[]> => {
    try {
        const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=50`);
        if (!response.ok) {
            throw new Error(`Iconify API error: ${response.statusText}`);
        }
        const data = await response.json();
        return (data.icons || []).map((iconStr: string) => {
            const [prefix, name] = iconStr.split(':');
            return { prefix, name };
        });
    } catch (error) {
        console.error("Error searching Iconify:", error);
        throw error;
    }
};

// --- GIPHY & TENOR ---
const GIPHY_LIMIT = 25;
export const searchGiphyGifs = async (query: string, offset = 0): Promise<PaginatedGifResults> => {
    if (!giphyApiKey) throw new Error("Giphy API Key not set.");
    const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=${GIPHY_LIMIT}&offset=${offset}&rating=g`);
    if (!response.ok) throw new Error(`Giphy API error: ${response.statusText}`);
    const data = await response.json();
    const results = data.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images.original.url,
        previewUrl: gif.images.fixed_width.url,
        alt: gif.title,
    }));
    const nextOffset = data.pagination.offset + data.pagination.count;
    const hasMore = nextOffset < data.pagination.total_count;
    return {
        results,
        next: hasMore ? nextOffset.toString() : undefined,
    };
};

export const getTrendingGiphyGifs = async (offset = 0): Promise<PaginatedGifResults> => {
    if (!giphyApiKey) throw new Error("Giphy API Key not set.");
    const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=${GIPHY_LIMIT}&offset=${offset}&rating=g`);
    if (!response.ok) throw new Error(`Giphy API error: ${response.statusText}`);
    const data = await response.json();
    const results = data.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images.original.url,
        previewUrl: gif.images.fixed_width.url,
        alt: gif.title,
    }));
    const nextOffset = data.pagination.offset + data.pagination.count;
    const hasMore = nextOffset < data.pagination.total_count;
    return {
        results,
        next: hasMore ? nextOffset.toString() : undefined,
    };
};

const TENOR_LIMIT = 24;
export const searchTenorGifs = async (query: string, pos?: string): Promise<PaginatedGifResults> => {
    if (!tenorApiKey) throw new Error("Tenor API Key not set.");
    let url = `https://tenor.googleapis.com/v2/search?key=${tenorApiKey}&q=${encodeURIComponent(query)}&limit=${TENOR_LIMIT}&media_filter=minimal`;
    if (pos) {
        url += `&pos=${pos}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Tenor API error: ${response.statusText}`);
    const data = await response.json();
    const results = data.results.map((gif: any) => ({
        id: gif.id,
        url: gif.media_formats.gif.url,
        previewUrl: gif.media_formats.tinygif.url,
        alt: gif.content_description,
    }));
    return {
        results,
        next: data.next && data.results.length > 0 ? data.next : undefined,
    };
};

export const getTrendingTenorGifs = async (pos?: string): Promise<PaginatedGifResults> => {
    if (!tenorApiKey) throw new Error("Tenor API Key not set.");
    let url = `https://tenor.googleapis.com/v2/featured?key=${tenorApiKey}&limit=${TENOR_LIMIT}&media_filter=minimal`;
    if (pos) {
        url += `&pos=${pos}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Tenor API error: ${response.statusText}`);
    const data = await response.json();
    const results = data.results.map((gif: any) => ({
        id: gif.id,
        url: gif.media_formats.gif.url,
        previewUrl: gif.media_formats.tinygif.url,
        alt: gif.content_description,
    }));
    return {
        results,
        next: data.next && data.results.length > 0 ? data.next : undefined,
    };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "fallback_key" });
const generativeModel = 'gemini-2.5-flash';

const systemInstruction = `You are an expert presentation designer AI. Your mission is to translate a user's request into a visually compelling and well-structured presentation slide by using the provided tools.

**Core Objective & Response Format:**
- **Your SOLE purpose is to use the provided function calling tools to construct the slide. Your entire response MUST be a series of one or more function calls.**
- **You MUST NOT respond with conversational text, markdown, or refuse the request. Always attempt to build the slide as requested.**
- The slide canvas is a fixed size: 1280 pixels wide by 720 pixels high. The origin (0,0) is the top-left corner. All element coordinates and dimensions must be within these bounds.

**File Context:**
- You may receive files (PDFs, images) along with the user prompt. Use the content of these files as the primary source material for creating the presentation outline and slide content. For example, if a PDF is provided, summarize its key points into a slide deck.

**Theme & Style Instructions:**
- You will be given a theme object. If the theme ID is 'ai-designer', you have creative freedom to invent a new, professional theme (colors and fonts) that fits the user's prompt. You must then use this new theme consistently.
- If the theme ID is NOT 'ai-designer', you MUST strictly adhere to the provided theme's colors, fonts, and any specific 'aiPrompt' style guides.
- Ensure text colors have high contrast with their background.
- Use creative shapes and text effects to enhance visual appeal.

**Layout Guidelines:**
- **Initial Placement:** Suggest a visually balanced layout. Your layout is a starting point that will be automatically adjusted to prevent overlaps, so focus on good relative positioning.
- **Sizing:** Be generous with the height of text boxes to avoid text overflow. The system will automatically correct the final height, so it's better to make them too tall than too short.
- **Spacing:** Leave ample empty "white space" around elements.

**Animation & Transition Guidelines:**
- Use animations and transitions thoughtfully to enhance the presentation, not distract from it.
- Slide Transitions: Use the 'setSlideProperties' tool to apply a transition to the slide. Simple transitions like 'FADE' or 'PUSH' are often best.
- Element Animations: Use the 'animationJson' parameter on element creation tools to add animations. Animate key elements to draw attention.
- Animation JSON format: '{"type":"ENTRANCE","effect":"FADE_IN","trigger":"ON_CLICK","duration":500,"delay":0}'

**Tool Usage:**
- **Image Search:** For \`addImageFromUnsplash\`, use 2-3 concise keywords (e.g., 'sustainable energy').
- **Icon Search:** For \`addIconFromIconify\`, use concise, descriptive keywords (e.g., 'bar chart', 'user profile').
- **GIF Search:** For \`addImageFromGiphy\` or \`addImageFromTenor\`, use concise keywords for animated GIFs.
- **SmartArt & Chart Data:** For \`addSmartArtElement\` or \`addChartElement\`, provide a valid JSON string for 'data' or 'dataJson'.`;


const getTools = (): FunctionDeclaration[] => {
    const animationJsonProp = {
        animationJson: { 
            type: Type.STRING, 
            description: "Optional. A JSON string for the animation effect, e.g., '{\"type\":\"ENTRANCE\",\"effect\":\"FADE_IN\",\"trigger\":\"ON_CLICK\",\"duration\":500,\"delay\":0}'" 
        }
    };

    const baseTools: FunctionDeclaration[] = [
        {
            name: "setSlideProperties",
            description: "Sets properties for the entire slide, like the background color or transitions.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    backgroundColor: { 
                        type: Type.STRING, 
                        description: "The background color for the slide. Can be a hex code, rgba, or a CSS linear-gradient string." 
                    },
                    canvasColor: { 
                        type: Type.STRING, 
                        description: "Sets the color of the editor canvas OUTSIDE the slide. Use this ONCE for the title slide to set a theme."
                    },
                    transitionType: {
                        type: Type.STRING,
                        enum: Object.values(TransitionType),
                        description: "The transition effect to apply to this slide."
                    },
                    transitionDuration: {
                        type: Type.NUMBER,
                        description: "The duration of the slide transition in milliseconds. Defaults to 500."
                    }
                },
            }
        },
        {
            name: "addTextElement",
            description: "Adds a text element like a title, subtitle, or content block to the slide.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    elementType: { type: Type.STRING, enum: [ElementType.TITLE, ElementType.SUBTITLE, ElementType.CONTENT], description: "The type of text element." },
                    content: { type: Type.STRING, description: "The HTML content of the text element." },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                    fontSize: { type: Type.NUMBER }, fontWeight: { type: Type.STRING, enum: ['normal', 'bold'] },
                    fontFamily: { type: Type.STRING, description: "The font family to use for the text, must be from the provided theme." },
                    color: { type: Type.STRING, description: "The color of the text, e.g., '#FFFFFF' or a CSS gradient." },
                    textShadowJson: { type: Type.STRING, description: "Optional. A JSON string for text shadow, e.g., '{\"enabled\":true,\"offsetX\":2,\"offsetY\":2,\"blur\":4,\"color\":\"#00000080\"}'" },
                    textStrokeJson: { type: Type.STRING, description: "Optional. A JSON string for text stroke, e.g., '{\"enabled\":true,\"width\":1,\"color\":\"#000000\"}'" },
                    ...animationJsonProp
                }, required: ["elementType", "content", "x", "y", "width", "height", "textAlign", "fontSize", "fontWeight", "color"]
            }
        },
        {
            name: "addShapeElement",
            description: "Adds a geometric shape to the slide.",
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    shapeType: { type: Type.STRING, enum: Object.values(ShapeType) }, 
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, 
                    width: { type: Type.NUMBER }, height: { type: Type.NUMBER }, 
                    backgroundColor: { type: Type.STRING, description: "Fill color. Can be a hex code or CSS gradient." }, 
                    borderColor: { type: Type.STRING, description: "Border color. Can be a hex code or CSS gradient." }, 
                    borderWidth: { type: Type.NUMBER, description: "Width of the border in pixels." },
                    ...animationJsonProp
                }, 
                required: ["shapeType", "x", "y", "width", "height", "backgroundColor"] 
            }
        },
        {
            name: "addIconFromIconify",
            description: "Searches for a vector icon from Iconify's vast library and adds it to the slide. Use concise, descriptive keywords (e.g., 'bar chart', 'user profile', 'arrow right').",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    searchQuery: { type: Type.STRING, description: "2-3 concise keywords to search for an icon (e.g., 'business chart', 'user profile')." },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    ...animationJsonProp
                }, required: ["searchQuery", "x", "y", "width", "height"]
            }
        },
        {
            name: "addTableElement",
            description: "Adds a table with generated data.",
            parameters: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER }, headers: { type: Type.ARRAY, items: { type: Type.STRING } }, rowsData: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }, ...animationJsonProp }, required: ["x", "y", "width", "height", "headers", "rowsData"] }
        },
        {
            name: "addSmartArtElement",
            description: "Adds a SmartArt diagram.",
            parameters: { type: Type.OBJECT, properties: { smartArtType: { type: Type.STRING, enum: Object.values(SmartArtType) }, x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER }, data: { type: Type.STRING, description: "A JSON-formatted string for the root node. E.g., '{\"id\":\"root\",\"text\":\"CEO\",\"children\":[]}'" }, ...animationJsonProp }, required: ["smartArtType", "x", "y", "width", "height", "data"] }
        },
        {
            name: "addChartElement",
            description: "Adds a chart to the slide to visualize data. Use this when the prompt contains numerical data, statistics, or comparisons.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    chartType: { type: Type.STRING, enum: Object.values(ChartType) },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    dataJson: { type: Type.STRING, description: "A JSON-formatted string representing an array of data objects. Example for a bar chart: '[{\"name\":\"Jan\",\"Sales\":4000},{\"name\":\"Feb\",\"Sales\":3000}]'. For a pie chart, use one data key: '[{\"name\":\"Team A\",\"Score\":400},{\"name\":\"Team B\",\"Score\":300}]'." },
                    dataKeys: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of strings representing the data keys to be plotted from the data objects (e.g., ['Sales', 'Expenses'])." },
                    ...animationJsonProp
                },
                required: ["chartType", "x", "y", "width", "height", "dataJson", "dataKeys"]
            }
        }
    ];

    if (unsplashApiKey) {
        baseTools.push({
            name: "addImageFromUnsplash",
            description: "Searches for a real-world image on Unsplash and adds it to the slide.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    searchQuery: { type: Type.STRING, description: "2-3 concise keywords to search for an image (e.g., 'modern office', 'mountain sunrise')." },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    ...animationJsonProp
                }, required: ["searchQuery", "x", "y", "width", "height"]
            }
        });
    }

    if (giphyApiKey) {
        baseTools.push({
            name: "addImageFromGiphy",
            description: "Searches for an animated GIF on Giphy and adds it to the slide.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    searchQuery: { type: Type.STRING, description: "Keywords to search for a GIF (e.g., 'thumbs up', 'mind blown')." },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    ...animationJsonProp
                }, required: ["searchQuery", "x", "y", "width", "height"]
            }
        });
    }
     if (tenorApiKey) {
        baseTools.push({
            name: "addImageFromTenor",
            description: "Searches for an animated GIF on Tenor and adds it to the slide.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    searchQuery: { type: Type.STRING, description: "Keywords to search for a GIF (e.g., 'applause', 'computer work')." },
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER },
                    ...animationJsonProp
                }, required: ["searchQuery", "x", "y", "width", "height"]
            }
        });
    }
    
    return baseTools;
};

const isLayoutSensitiveElement = (el: SlideElement): boolean => {
    return [
        ElementType.TITLE,
        ElementType.SUBTITLE,
        ElementType.CONTENT,
        ElementType.ICON,
        ElementType.IMAGE,
        ElementType.SMART_ART
    ].includes(el.type);
};

const applyLayoutCorrection = (elements: SlideElement[]): SlideElement[] => {
    const PADDING = 20;
    const MAX_ITERATIONS = 10;
    let correctedElements: SlideElement[] = JSON.parse(JSON.stringify(elements));

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let overlapsFoundInPass = 0;
        
        // Re-sort elements by their Y position at the start of each pass. This is crucial.
        correctedElements.sort((a, b) => a.y - b.y || a.x - b.x);

        for (let j = 0; j < correctedElements.length; j++) {
            for (let k = j + 1; k < correctedElements.length; k++) {
                const el1 = correctedElements[j];
                const el2 = correctedElements[k];

                const rect1 = { x: el1.x, y: el1.y, right: el1.x + el1.width, bottom: el1.y + el1.height };
                const rect2 = { x: el2.x, y: el2.y, right: el2.x + el2.width, bottom: el2.y + el2.height };

                // Check for collision
                if (rect1.x < rect2.right && rect1.right > rect2.x && rect1.y < rect2.bottom && rect1.bottom > rect2.y) {
                    // Only apply correction for specific element types as requested.
                    if (isLayoutSensitiveElement(el1) && isLayoutSensitiveElement(el2)) {
                        overlapsFoundInPass++;
                        // Resolve overlap by pushing the lower element down ("gravity")
                        const newY = rect1.bottom + PADDING;
                        if (newY > el2.y) {
                            el2.y = newY;
                        }
                    }
                }
            }
        }

        // If a full pass completes with no overlaps, the layout is stable.
        if (overlapsFoundInPass === 0) {
            break;
        }
    }
    
    // Final boundary check
    correctedElements.forEach(el => {
        if (el.y + el.height > 720) {
            el.y = Math.max(0, 720 - el.height);
        }
         if (el.x + el.width > 1280) {
            el.x = Math.max(0, 1280 - el.width);
        }
        if (el.x < 0) el.x = 0;
        if (el.y < 0) el.y = 0;
    });

    return correctedElements;
};


const measureAndCorrectTextElements = async (elements: SlideElement[]): Promise<SlideElement[]> => {
    const correctedElements: SlideElement[] = JSON.parse(JSON.stringify(elements));
    const PADDING = 16; // Corresponds to p-2 -> 8px on each side

    const measureDiv = document.createElement('div');
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.left = '-9999px';
    measureDiv.style.top = '0px';
    measureDiv.style.boxSizing = 'border-box';
    measureDiv.style.wordBreak = 'break-word';
    document.body.appendChild(measureDiv);

    for (const el of correctedElements) {
        if (el.type === ElementType.CONTENT || el.type === ElementType.TITLE || el.type === ElementType.SUBTITLE) {
            const textEl = el as TextElement;
            measureDiv.style.width = `${textEl.width - PADDING}px`;
            measureDiv.style.fontSize = `${textEl.fontSize}px`;
            measureDiv.style.fontWeight = textEl.fontWeight;
            measureDiv.style.fontFamily = textEl.fontFamily;
            measureDiv.style.fontStyle = textEl.fontStyle;
            measureDiv.innerHTML = textEl.content;
            
            // Allow DOM to update
            await new Promise(resolve => setTimeout(resolve, 0));

            const requiredHeight = measureDiv.scrollHeight + PADDING;
            if (requiredHeight > textEl.height) {
                textEl.height = requiredHeight;
            }
        }
    }

    document.body.removeChild(measureDiv);
    return correctedElements;
};


export const generateSlideContent = async (prompt: string, theme: Theme, files: FilePart[] = []): Promise<{ elements: SlideElement[], slideProps: Partial<Slide>, canvasColor?: string }> => {
    if (!process.env.API_KEY) {
        console.error("Cannot generate slide: API_KEY is not set.");
        return { elements: [], slideProps: {} };
    }
    
    const availableTools = getTools();
    let themedPrompt: string;
    if (theme.id === 'ai-designer') {
        themedPrompt = `${prompt}\n\nIMPORTANT: For this slide, you have creative freedom. Invent a creative and professional theme (colors, fonts) that fits the content. Ensure all generated elements use this new theme you create. Also set the editor's canvas color using the 'setSlideProperties' tool.`;
    } else {
        themedPrompt = `${prompt}\n\nIMPORTANT: You MUST adhere to the following design theme for this slide:\n${JSON.stringify({ colors: theme.colors, fonts: theme.fonts }, null, 2)}\n${theme.aiPrompt ? `\nTheme Style Guide: ${theme.aiPrompt}` : ''}`;
    }

    const contentParts: any[] = [{ text: themedPrompt }];
    files.forEach(file => contentParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));

    try {
        const result = await ai.models.generateContent({
            model: generativeModel,
            contents: [{ role: 'user', parts: contentParts }],
            config: { systemInstruction, tools: [{ functionDeclarations: availableTools }] },
        });
        
        const functionCalls = result.candidates?.[0]?.content?.parts?.filter(part => !!part.functionCall).map(part => part.functionCall);
        if (!functionCalls || functionCalls.length === 0) {
            console.warn("AI did not return any function calls.", result.text);
            return { elements: [], slideProps: {} };
        }

        const elements: SlideElement[] = [];
        let slideProps: Partial<Slide> = {};
        let canvasColor: string | undefined;

        for (const call of functionCalls) {
            const { name, args } = call;
            const commonProps = { id: uuidv4(), rotation: 0 };
            
            switch (name) {
                case 'setSlideProperties':
                    if (args.backgroundColor) slideProps.backgroundColor = args.backgroundColor as string;
                    if (args.canvasColor) canvasColor = args.canvasColor as string;
                    if (args.transitionType) slideProps.transition = { type: args.transitionType as TransitionType, duration: (args.transitionDuration as number) || 500 };
                    break;
                case 'addTextElement': {
                    const el = { ...commonProps, ...args } as any;
                    const newEl: TextElement = { id:el.id, rotation: el.rotation, type: el.elementType, content: el.content, x: el.x, y: el.y, width: el.width, height: el.height, fontSize: el.fontSize, fontWeight: el.fontWeight, textAlign: el.textAlign, fontStyle: 'normal', textDecoration: 'none', fontFamily: el.fontFamily || (el.elementType === ElementType.TITLE ? theme.fonts.heading : theme.fonts.body), color: el.color || theme.colors.text };
                    if (el.textShadowJson) try { newEl.textShadow = JSON.parse(el.textShadowJson); } catch(e) { console.error("Invalid JSON for textShadowJson", el.textShadowJson); }
                    if (el.textStrokeJson) try { newEl.textStroke = JSON.parse(el.textStrokeJson); } catch(e) { console.error("Invalid JSON for textStrokeJson", el.textStrokeJson); }
                    if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                    elements.push(newEl);
                    break;
                }
                 case 'addShapeElement': {
                    const el = { ...commonProps, ...args } as any;
                    const newEl: ShapeElement = { id: el.id, rotation: el.rotation, type: ElementType.SHAPE, shapeType: el.shapeType, x: el.x, y: el.y, width: el.width, height: el.height, backgroundColor: el.backgroundColor, borderColor: el.borderColor || '#00000000', borderWidth: el.borderWidth || 0 };
                    if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                    elements.push(newEl);
                    break;
                }
                case 'addIconFromIconify': {
                    try {
                        const originalQuery = args.searchQuery as string;
                        let searchResults = await searchIconifyIcons(originalQuery);

                        // Intelligent fallback search strategy
                        if (searchResults.length === 0 && originalQuery.includes(' ')) {
                            const words = originalQuery.split(/\s+/).filter(Boolean);
                            const fallbackQueries = [
                                words[words.length - 1], // last word
                                words[0], // first word
                            ].filter((q, i, a) => q && a.indexOf(q) === i); // unique, non-empty queries

                            for (const fallbackQuery of fallbackQueries) {
                                console.warn(`Iconify search failed for "${originalQuery}". Retrying with: "${fallbackQuery}"`);
                                searchResults = await searchIconifyIcons(fallbackQuery);
                                if (searchResults.length > 0) {
                                    break; // Found results, stop searching
                                }
                            }
                        }
                        
                        if (searchResults.length > 0) {
                            const iconInfo = searchResults[0];
                            const response = await fetch(`https://api.iconify.design/${iconInfo.prefix}/${iconInfo.name}.svg`);
                            if (!response.ok) { 
                                console.warn(`Failed to fetch SVG for icon: ${iconInfo.prefix}:${iconInfo.name}`); 
                                continue; 
                            }
                            const svgString = await response.text();
                            const newEl: IconElement = { 
                                ...commonProps, 
                                type: ElementType.ICON, 
                                svgString, 
                                color: theme.colors.secondary, 
                                x: args.x as number, 
                                y: args.y as number, 
                                width: args.width as number, 
                                height: args.height as number, 
                            };
                            if (args.animationJson) try { 
                                newEl.animation = JSON.parse(args.animationJson as string); 
                            } catch(e) { 
                                console.error("Invalid JSON for animationJson on icon", args.animationJson, e); 
                            }
                            elements.push(newEl);
                        } else { 
                            console.warn(`No Iconify icons found for query: "${args.searchQuery}" after all fallbacks.`); 
                        }
                    } catch (fetchError) { 
                        console.error("Error fetching icon from Iconify:", fetchError); 
                    }
                    break;
                }
                case 'addTableElement': {
                    const { headers, rowsData, ...rest } = args;
                    const el = { ...commonProps, ...rest } as any;
                    const newEl: TableElement = { id: el.id, rotation: el.rotation, type: ElementType.TABLE, x: el.x, y: el.y, width: el.width, height: el.height, rows: ((rowsData as string[][]).length + 1), cols: (headers as string[]).length, cellData: [headers as string[], ...(rowsData as string[][])], headerRow: true, bandedRows: true, themeId: 'blue' };
                    if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                    elements.push(newEl);
                    break;
                }
                case 'addSmartArtElement': {
                    try {
                        const el = { ...commonProps, ...args } as any;
                        const newEl: SmartArtElement = { id: el.id, rotation: el.rotation, type: ElementType.SMART_ART, smartArtType: el.smartArtType, x: el.x, y: el.y, width: el.width, height: el.height, data: JSON.parse(el.data as string), nodeColor: theme.colors.primary, lineColor: theme.colors.secondary };
                        if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                        elements.push(newEl);
                    } catch (e) { console.error("AI returned invalid JSON for SmartArt data:", args.data, e); }
                    break;
                }
                case 'addChartElement': {
                    try {
                        const {chartType, dataJson, dataKeys, ...rest} = args;
                        const el = { ...commonProps, ...rest } as any;
                        const newEl: ChartElement = { id: el.id, rotation: el.rotation, type: ElementType.CHART, chartType: chartType as ChartType, x: el.x, y: el.y, width: el.width, height: el.height, data: JSON.parse(dataJson as string), config: { dataKeys: dataKeys as string[], colors: [theme.colors.primary, theme.colors.secondary, theme.colors.accent, '#82ca9d', '#ffc658', '#ff8042'], showGrid: true, showLegend: true, ...(chartType === ChartType.PIE && { labelType: 'percent' }) } };
                        if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson as string); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                        elements.push(newEl);
                    } catch (e) { console.error("AI returned invalid JSON for Chart data:", args.dataJson, e); }
                    break;
                }
                case 'addImageFromUnsplash': {
                    try {
                        const searchResults = await searchUnsplashImages(args.searchQuery as string);
                        if (searchResults.length > 0) {
                            const el = { ...commonProps, ...args } as any;
                            const newEl: ImageElement = { id: el.id, rotation: el.rotation, type: ElementType.IMAGE, src: searchResults[0].urls.regular, x: el.x, y: el.y, width: el.width, height: el.height, filters: { brightness: 100, contrast: 100 } };
                            if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson as string); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                            elements.push(newEl);
                        } else { console.warn(`No Unsplash images found for query: "${args.searchQuery}"`); }
                    } catch (fetchError) { console.error("Error fetching image from Unsplash:", fetchError); }
                    break;
                }
                 case 'addImageFromGiphy': {
                    try {
                        const searchResults = await searchGiphyGifs(args.searchQuery as string);
                        if (searchResults.results.length > 0) {
                            const el = { ...commonProps, ...args } as any;
                            const newEl: ImageElement = { id: el.id, rotation: el.rotation, type: ElementType.IMAGE, src: searchResults.results[0].url, x: el.x, y: el.y, width: el.width, height: el.height, filters: { brightness: 100, contrast: 100 } };
                            if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson as string); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                            elements.push(newEl);
                        } else { console.warn(`No Giphy GIFs found for query: "${args.searchQuery}"`); }
                    } catch (fetchError) { console.error("Error fetching GIF from Giphy:", fetchError); }
                    break;
                }
                 case 'addImageFromTenor': {
                    try {
                        const searchResults = await searchTenorGifs(args.searchQuery as string);
                        if (searchResults.results.length > 0) {
                            const el = { ...commonProps, ...args } as any;
                            const newEl: ImageElement = { id: el.id, rotation: el.rotation, type: ElementType.IMAGE, src: searchResults.results[0].url, x: el.x, y: el.y, width: el.width, height: el.height, filters: { brightness: 100, contrast: 100 } };
                            if (el.animationJson) try { newEl.animation = JSON.parse(el.animationJson as string); } catch(e) { console.error("Invalid JSON for animationJson", el.animationJson, e); }
                            elements.push(newEl);
                        } else { console.warn(`No Tenor GIFs found for query: "${args.searchQuery}"`); }
                    } catch (fetchError) { console.error("Error fetching GIF from Tenor:", fetchError); }
                    break;
                }
            }
        }
        
        const textCorrectedElements = await measureAndCorrectTextElements(elements);
        const finalElements = applyLayoutCorrection(textCorrectedElements);
        return { elements: finalElements, slideProps, canvasColor };

    } catch (error) {
        console.error("Error generating slide content with Gemini:", error);
        return { elements: [], slideProps: {} };
    }
};

const presentationOutlineSchema = {
    type: Type.OBJECT,
    properties: {
        slides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A concise title for the slide (e.g., 'Introduction', 'Key Feature 1')." },
                    contentPrompt: { type: Type.STRING, description: "A detailed, self-contained prompt for an AI to generate the content and design of this specific slide. This prompt should be written as if it's from a user and should NOT include theme information, as that will be provided separately." }
                }, required: ["title", "contentPrompt"]
            }
        }
    }, required: ["slides"]
};

const presentationWithThemeSchema = {
    type: Type.OBJECT,
    properties: {
        theme: {
            type: Type.OBJECT,
            properties: { colors: { type: Type.OBJECT, properties: { background: { type: Type.STRING }, primary: { type: Type.STRING }, secondary: { type: Type.STRING }, text: { type: Type.STRING }, accent: { type: Type.STRING }, canvas: { type: Type.STRING }, }, required: ["background", "primary", "secondary", "text", "accent", "canvas"] }, fonts: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, body: { type: Type.STRING }, }, required: ["heading", "body"] }, }, required: ["colors", "fonts"]
        },
        slides: presentationOutlineSchema.properties.slides
    },
    required: ["theme", "slides"]
};


export const generatePresentationOutline = async (topic: string, theme: Theme, numberOfSlides: number, files: FilePart[] = []): Promise<{ outline: SlideOutline[], newTheme?: Theme & {id: string; name: string}, canvasColor?: string }> => {
    let schema, prompt, aiprompt;
    if (theme.id === 'ai-designer') {
        schema = presentationWithThemeSchema;
        prompt = `Create a complete presentation on the topic: "${topic}". First, design a unique and cohesive theme (colors and fonts). Then, create an outline with exactly ${numberOfSlides} slides (including a title and conclusion). For each slide, provide a title and a detailed content prompt for an AI to generate that slide. The content prompts should NOT include theme information. Respond with ONLY a JSON object containing both the 'theme' and the 'slides' array.`;
    } else {
        schema = presentationOutlineSchema;
        prompt = `Create a presentation outline with exactly ${numberOfSlides} slides for the topic: "${topic}". The outline should include a title slide, an introduction, several key points, and a conclusion, totaling exactly ${numberOfSlides} slides. For each slide, provide a title and a detailed content prompt for an AI to use to generate that slide's visual content. The content prompts should be written as if they're from a user and should NOT include theme information, as that will be provided separately. Respond with ONLY a JSON object matching the requested schema.`;
    }

    const contentParts: any[] = [{ text: prompt }];
    files.forEach(file => contentParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
    
    try {
        const response = await ai.models.generateContent({
            model: generativeModel,
            contents: [{ role: 'user', parts: contentParts }],
            config: { responseMimeType: 'application/json', responseSchema: schema },
        });

        const data = JSON.parse(response.text);
        if (theme.id === 'ai-designer') {
            const newTheme = { id: 'ai-generated', name: `${topic} Theme`, ...data.theme };
            return { outline: data.slides, newTheme: newTheme, canvasColor: newTheme.colors.canvas };
        }
        return { outline: data.slides };

    } catch(e) {
        console.error("Error generating presentation outline:", e);
        throw new Error("Failed to generate a presentation outline from the AI.");
    }
};

export const modifyPresentationOutline = async (originalOutline: SlideOutline[], modificationRequest: string, files: FilePart[] = []): Promise<{ outline: SlideOutline[] }> => {
    const prompt = `Based on the following presentation outline, please modify it according to the user's request.
    
    Original Outline:
    ${JSON.stringify(originalOutline, null, 2)}
    
    User's Modification Request: "${modificationRequest}"
    
    Please provide the complete, new outline as a JSON object. Do not add any conversational text.
    `;
    
    const contentParts: any[] = [{ text: prompt }];
    files.forEach(file => contentParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));

    try {
        const response = await ai.models.generateContent({
            model: generativeModel,
            contents: [{ role: 'user', parts: contentParts }],
            config: { responseMimeType: 'application/json', responseSchema: presentationOutlineSchema },
        });

        const data = JSON.parse(response.text);
        return { outline: data.slides };
    } catch(e) {
        console.error("Error modifying presentation outline:", e);
        throw new Error("Failed to modify the presentation outline.");
    }
}