import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export const generateTutorResponse = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  grade: string,
  topic: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const systemInstruction = `You are Dr. Lem, a warm, encouraging female Science & Biology tutor for NextGen Academy. 
  The student is in ${grade} and wants to learn about ${topic}.
  
  Your response should follow this structure:
  1. Conversational explanation (warm, simple for kids, deep for PhDs).
  2. A visualization block at the VERY END.
  
  Visualization rules:
  - For processes/flows, use Mermaid syntax: \`\`\`mermaid graph TD; ... \`\`\`
  - For anatomy/structures, use SVG syntax: \`\`\`html <svg ...> ... </svg> \`\`\`
  - Keep the conversational text free of markdown/emojis except for a few biology ones like 🧬.
  - DO NOT overlap text and code. Code blocks MUST be at the end.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
    },
  });

  return response.text;
};

export const parseResponse = (text: string) => {
  const mermaidRegex = /```mermaid([\s\S]*?)```/;
  const svgRegex = /```html([\s\S]*?)```/;
  
  const mermaidMatch = text.match(mermaidRegex);
  const svgMatch = text.match(svgRegex);
  
  let vizCode = '';
  let vizType: 'mermaid' | 'svg' | undefined;
  
  if (mermaidMatch) {
    vizCode = mermaidMatch[1].trim();
    vizType = 'mermaid';
  } else if (svgMatch) {
    vizCode = svgMatch[1].trim();
    vizType = 'svg';
  }
  
  const cleanText = text
    .replace(mermaidRegex, '')
    .replace(svgRegex, '')
    .trim();
    
  return { cleanText, vizCode, vizType };
};
