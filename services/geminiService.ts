import { GoogleGenAI } from "@google/genai";
import { Slide, ElementType, TextElement } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "fallback_key" });

export const getDesignSuggestions = async (slide: Slide): Promise<string[]> => {
  // This function no longer uses AI to generate images for backgrounds.
  // Instead, it returns a curated list of professional, subtle CSS gradients.
  // This is faster, more reliable, and avoids API costs for this feature.
  console.log("Using predefined CSS gradient design suggestions.");
  
  return Promise.resolve([
    'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(to top, #accbee 0%, #e7f0fd 100%)',
    'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(to top, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(45deg, rgb(243, 231, 233) 0%, rgb(227, 238, 255) 100%)',
  ]);
};
