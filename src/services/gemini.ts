import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export const generateTutorResponse = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  grade: string,
  topic: string
) => {
  const mode = (localStorage.getItem('academy_modelMode') as 'local' | 'pro') || 'local';
  const proKey = localStorage.getItem('academy_apiKey');
  const apiKey = (mode === 'pro' && proKey) ? proKey : process.env.GEMINI_API_KEY!;
  
  if (!apiKey && mode === 'pro') {
    throw new Error("Pro Mode: No API Key found. Please add your key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  
  const isLocal = mode === 'local';

  const systemInstruction = isLocal 
    ? `You are Dr. Lem, a warm Science tutor. 
       CRITICAL RULES FOR LOCAL MODE:
       1. VOICE-OPTIMIZED TEXT: Explanation FIRST, plain conversational text only. 
       2. NO emojis, NO markdown (*, #, etc). Screen reader must read naturally.
       3. VISUALIZATIONS = CLIENT-SIDE CODE ONLY.
       4. ALL CODE BLOCKS AT VERY END, separated by 2 blank lines.
       
       Example Structure:
       A cell membrane acts like a gatekeeper, controlling what enters and leaves the cell.
       
       \`\`\`mermaid
       graph LR; A[Glucose] --> B[Chloroplast];
       \`\`\`
       
       \`\`\`html
       <svg viewBox="0 0 300 200">...</svg>
       \`\`\``
    : `You are Dr. Lem, a warm, encouraging female Science & Biology tutor for NextGen Academy. 
       The student is in ${grade} and wants to learn about ${topic}.
       
       Your response should follow this structure:
       1. Conversational explanation (warm, simple for kids, deep for PhDs).
       2. A visualization block at the VERY END.
       
       Visualization rules:
       - For processes/flows, use Mermaid syntax: \`\`\`mermaid graph TD; ... \`\`\`
       - For anatomy/structures, use SVG syntax: \`\`\`html <svg ...> ... </svg> \`\`\`
       - Keep the conversational text free of markdown/emojis except for a few biology ones like 🧬.
       - DO NOT overlap text and code. Code blocks MUST be at the end.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error: any) {
    if (error.status === 429) {
      alert("Free quota reached. Upgrade at provider site for unlimited—your key controls everything.");
      return "I've reached my temporary limit! Please check your provider dashboard to upgrade or switch to Free Local mode.";
    }
    throw error;
  }
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
