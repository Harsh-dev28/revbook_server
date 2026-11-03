import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apikey: process.env.GEMINI_API_KEY });

export default ai;