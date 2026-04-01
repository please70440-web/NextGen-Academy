import { GoogleGenAI, Modality, Type, ThinkingLevel, GenerateContentResponse, VideoGenerationReferenceType } from "@google/genai";

const getAI = () => {
  const mode = (localStorage.getItem('academy_modelMode') as 'local' | 'pro') || 'local';
  const proKey = localStorage.getItem('academy_apiKey');
  const apiKey = (mode === 'pro' && proKey) ? proKey : process.env.GEMINI_API_KEY!;
  
  if (!apiKey && mode === 'pro') {
    throw new Error("Pro Mode: No API Key found. Please add your key in settings.");
  }

  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

export const generateTutorResponse = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  grade: string,
  topic: string,
  options: { 
    useSearch?: boolean; 
    useMaps?: boolean; 
    useThinking?: boolean;
    useFast?: boolean;
    useComplex?: boolean;
    location?: { latitude: number; longitude: number };
    attachments?: { data: string; mimeType: string }[];
  } = {}
) => {
  const ai = getAI();
  const mode = (localStorage.getItem('academy_modelMode') as 'local' | 'pro') || 'local';
  const isLocal = mode === 'local';

  let model = "gemini-3-flash-preview";
  if (options.useFast) model = "gemini-3.1-flash-lite-preview";
  if (options.useComplex || options.useThinking) model = "gemini-3.1-pro-preview";

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

  const tools: any[] = [];
  if (options.useSearch) tools.push({ googleSearch: {} });
  if (options.useMaps) tools.push({ googleMaps: {} });

  const parts: any[] = [{ text: prompt }];
  if (options.attachments) {
    options.attachments.forEach(att => {
      parts.push({
        inlineData: {
          data: att.data.split(',')[1],
          mimeType: att.mimeType
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [...history, { role: 'user', parts }],
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: options.useMaps && options.location ? {
          retrievalConfig: {
            latLng: options.location
          }
        } : undefined,
        thinkingConfig: options.useThinking ? {
          thinkingLevel: ThinkingLevel.HIGH
        } : undefined
      },
    });

    let text = response.text || "";
    
    // Extract grounding URLs if present
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const urls = groundingChunks
        .map((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
        .filter(Boolean);
      if (urls.length > 0) {
        text += "\n\nSources:\n" + Array.from(new Set(urls)).map(url => `- ${url}`).join('\n');
      }
    }

    return text;
  } catch (error: any) {
    if (error.status === 429) {
      return "I've reached my temporary limit! Please check your provider dashboard to upgrade or switch to Free Local mode.";
    }
    throw error;
  }
};

export const generateImage = async (prompt: string, options: { 
  size?: '1K' | '2K' | '4K' | '512px';
  aspectRatio?: string;
  quality?: 'standard' | 'studio';
} = {}) => {
  const ai = getAI();
  const model = options.quality === 'studio' ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        imageSize: options.size || '1K',
        aspectRatio: options.aspectRatio || '1:1'
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateVideo = async (prompt: string, options: {
  image?: string;
  lastFrame?: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
} = {}) => {
  const ai = getAI();
  const model = 'veo-3.1-fast-generate-preview';

  const config: any = {
    numberOfVideos: 1,
    aspectRatio: options.aspectRatio || '16:9',
    resolution: options.resolution || '720p'
  };

  if (options.lastFrame) {
    config.lastFrame = {
      imageBytes: options.lastFrame.split(',')[1],
      mimeType: options.lastFrame.split(';')[0].split(':')[1]
    };
  }

  let operation = await ai.models.generateVideos({
    model,
    prompt,
    image: options.image ? {
      imageBytes: options.image.split(',')[1],
      mimeType: options.image.split(';')[0].split(':')[1]
    } : undefined,
    config
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  const apiKey = (localStorage.getItem('academy_apiKey')) || process.env.GEMINI_API_KEY!;
  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: { 'x-goog-api-key': apiKey }
  });
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
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
