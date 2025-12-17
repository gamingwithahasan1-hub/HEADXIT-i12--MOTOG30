import { GoogleGenAI, Content, Tool } from "@google/genai";
import { Message, Subject, ThinkingLevel } from "../types";
import { SYSTEM_INSTRUCTIONS } from "../constants";

// Helper to convert internal Message structure to SDK Content structure
const mapMessagesToContent = (messages: Message[]): Content[] => {
  return messages.map(msg => ({
    role: msg.role,
    parts: msg.parts.map(p => {
      if (p.inlineData) {
        return {
          inlineData: {
            mimeType: p.inlineData.mimeType,
            data: p.inlineData.data
          }
        };
      }
      return { text: p.text || '' };
    })
  }));
};

// Utility to pause execution
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateResponse = async (
  history: Message[],
  currentSubject: Subject,
  thinkingLevel: ThinkingLevel,
  useSearch: boolean
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "The AI service is not configured correctly. Please set the API Key in your dashboard.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Determine initial model
  let modelName = 'gemini-2.5-flash'; 
  let thinkingBudget = 0;

  switch (thinkingLevel) {
    case 'deep':
      modelName = 'gemini-3-pro-preview'; // Powerful but low limits (2 RPM)
      thinkingBudget = 8192; 
      break;
    case 'moderate':
      modelName = 'gemini-2.5-flash'; // High limits (15 RPM)
      thinkingBudget = 2048;
      break;
    case 'none':
    default:
      modelName = 'gemini-2.5-flash';
      thinkingBudget = 0; 
      break;
  }

  const contents = mapMessagesToContent(history);
  const systemInstruction = SYSTEM_INSTRUCTIONS[currentSubject];

  const tools: Tool[] = [];
  if (useSearch) {
    tools.push({ googleSearch: {} });
  }

  // Retry Logic
  // We try a few times to handle glitches. 
  // If it fails consistently, we throw a specific error to show the Popup.
  let attempts = 0;
  const maxAttempts = 3; // Reduced to 3 so we show the popup faster if the user is blocked
  let delay = 1000; 

  while (attempts < maxAttempts) {
    try {
      attempts++;
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
          tools: tools.length > 0 ? tools : undefined,
        }
      });

      let text = response.text || "I couldn't generate a text response.";

      // Handle Grounding Metadata (Sources)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map((chunk: any) => {
            if (chunk.web) {
              return `- [${chunk.web.title}](${chunk.web.uri})`;
            }
            return null;
          })
          .filter(Boolean);

        const uniqueSources = [...new Set(sources)];

        if (uniqueSources.length > 0) {
          text += "\n\n---\n### 🌐 Sources\n" + uniqueSources.join("\n");
        }
      }

      return text;

    } catch (error: any) {
      const errorMessage = error.message?.toLowerCase() || "";
      
      // Check for Rate Limits (429) or Overloaded (503)
      const isRateLimit = errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit");
      const isServerOverload = errorMessage.includes("503") || errorMessage.includes("overloaded");

      if (isRateLimit || isServerOverload) {
        console.warn(`Attempt ${attempts}: Rate limit hit on ${modelName}.`);

        // SMART FALLBACK: 
        // If we were using the expensive 'Pro' model and hit a limit, switch to 'Flash' immediately.
        if (modelName === 'gemini-3-pro-preview') {
          console.log("Switching to Flash model for better availability...");
          modelName = 'gemini-2.5-flash';
          thinkingBudget = 0; 
          delay = 1000; 
          continue; 
        }

        // If we are already on Flash or can't switch, wait and retry
        if (attempts < maxAttempts) {
          await wait(delay);
          delay *= 1.5; 
          continue;
        }
      }

      // If we ran out of attempts and it was a rate limit issue, throw specific code
      if (attempts >= maxAttempts && (isRateLimit || isServerOverload)) {
        throw new Error("RATE_LIMIT_60"); // Tell App to show 60s popup
      }

      // For other errors, log and throw
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
  
  throw new Error("Connection failed.");
};