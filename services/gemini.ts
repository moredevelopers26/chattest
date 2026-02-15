
import { GoogleGenAI } from "@google/genai";

export const generateAiResponse = async (
  userPrompt: string, 
  history: { role: 'user' | 'model', parts: string }[],
  audioData?: { data: string, mimeType: string }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.parts }]
    }));

    const parts: any[] = [{ text: userPrompt || "He grabado este mensaje de voz para ti." }];
    
    if (audioData) {
      parts.push({
        inlineData: {
          data: audioData.data.split(',')[1], // Remove the data:audio/...;base64, prefix
          mimeType: audioData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...chatHistory,
        { role: 'user', parts: parts }
      ],
      config: {
        systemInstruction: "You are a helpful, witty, and concise chat assistant. You can receive text, images, and audio. If you receive audio, transcribe or summarize it if relevant. Keep messages short and friendly.",
        temperature: 0.8,
      }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with Gemini. Please try again later.";
  }
};
