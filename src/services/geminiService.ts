import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Cache para evitar re-enriquecer en la misma sesión
const enrichmentCache: Record<string, { generalDesc: string; businessHelp: string }> = {};

export async function enrichModelData(modelId: string, category: string): Promise<{ generalDesc: string; businessHelp: string } | null> {
  if (enrichmentCache[modelId]) return enrichmentCache[modelId];
  if (!ai) return null;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el modelo de IA "${modelId}" de la categoría "${category}". Provee una descripción técnica breve (máx 12 palabras) y una aplicación empresarial real que ahorre tiempo o dinero. Responde solo en JSON válido con las llaves "generalDesc" y "businessHelp".`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.text?.trim() || "";
    if (responseText) {
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const aiData = JSON.parse(cleanJson);
      const enriched = {
        generalDesc: aiData.generalDesc || "Modelo avanzado de IA.",
        businessHelp: aiData.businessHelp || "Optimización de procesos operativos."
      };
      enrichmentCache[modelId] = enriched;
      return enriched;
    }
  } catch (error) {
    console.error(`[Gemini Service] Error enriqueciendo ${modelId}:`, error);
  }
  return null;
}
