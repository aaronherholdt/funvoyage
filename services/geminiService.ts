
import { GoogleGenAI, Type } from "@google/genai";
import { NIA_SYSTEM_INSTRUCTION } from "../constants";
import { SessionEntry, SessionAnalysis } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateNiaResponse = async (
  history: { role: 'model' | 'user', text: string }[],
  contextPrompt: string,
  kidAge: number
): Promise<string> => {
  const client = getAIClient();
  if (!client) return "Oh no! I seem to have lost my internet connection. Check your API Key.";

  try {
    const messages = history.map(h => `${h.role === 'model' ? 'Nia' : 'Child'}: ${h.text}`).join('\n');
    const fullPrompt = `
      ${NIA_SYSTEM_INSTRUCTION}

      CONTEXT:
      Child's Age: ${kidAge}
      Current Task: ${contextPrompt}
      
      Current Conversation History:
      ${messages}
      
      Response (as Nia):
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    return response.text || "I'm listening...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a little trouble hearing you. Can we try that again?";
  }
};

export const analyzeSession = async (
  sessionData: SessionEntry[],
  countryName: string,
  city: string | undefined,
  kidAge: number
): Promise<SessionAnalysis | null> => {
  const client = getAIClient();
  if (!client) return null;

  try {
    const location = city ? `${city}, ${countryName}` : countryName;
    const prompt = `
      Analyze the following travel reflection conversation between an AI (Nia) and a child (Age: ${kidAge}) about ${location}.
      
      Task:
      1. Create a summary suited for the child's age (max 3 sentences).
      2. Extract one key insight or idea the child had.
      3. Score the child's responses (0-20 points) on these 4 traits based on depth of reflection relative to their age:
         - Curiosity
         - Empathy
         - Resilience
         - Problem Solving

      Transcript:
      ${JSON.stringify(sessionData)}
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                keyInsight: { type: Type.STRING },
                points: {
                    type: Type.OBJECT,
                    properties: {
                        curiosity: { type: Type.INTEGER },
                        empathy: { type: Type.INTEGER },
                        resilience: { type: Type.INTEGER },
                        problem_solving: { type: Type.INTEGER }
                    },
                    required: ["curiosity", "empathy", "resilience", "problem_solving"]
                }
            },
            required: ["summary", "keyInsight", "points"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as SessionAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
        summary: "You did a great job exploring today!",
        keyInsight: "Exploration is fun!",
        points: { curiosity: 10, empathy: 5, resilience: 5, problem_solving: 5 }
    };
  }
};

export const resolveLocation = async (input: string): Promise<{ 
    countryCode: string; 
    countryName: string; 
    city: string; 
    lat: number; 
    lng: number; 
    fact: string; 
} | null> => {
    const client = getAIClient();
    if (!client) return null;

    try {
        const prompt = `
            Identify the location from this input: "${input}".
            Return the ISO 2-letter Country Code, standard Country Name, City/Town name (if inferred, otherwise infer a major city), 
            approximate Latitude/Longitude, and a short fun fact for a kid (max 10 words).
        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        countryCode: { type: Type.STRING },
                        countryName: { type: Type.STRING },
                        city: { type: Type.STRING },
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                        fact: { type: Type.STRING }
                    },
                    required: ["countryCode", "countryName", "city", "lat", "lng", "fact"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;

    } catch (error) {
        console.error("Location resolution failed:", error);
        return null;
    }
};
