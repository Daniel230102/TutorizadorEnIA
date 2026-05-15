import { GoogleGenAI } from "@google/genai";

export interface DynamicModel {
  id: string;
  name: string;
  company: string;
  logo: string;
  color: string;
  type: string;
  tags: string[];
  generalDesc: string;
  businessHelp: string;
  context: string;
  year: string;
  likes: number;
  downloads: number;
}

// Inicialización de Gemini usando el nombre exacto del secreto del usuario
const geminiKey = process.env.ProyectoIA_API_Key || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiKey || "" });

// Cache en memoria para la sesión
const enrichmentCache: Record<string, { generalDesc: string; businessHelp: string }> = {};

const CATEGORY_COLORS: Record<string, string> = {
  "LLM":        "rgba(108,99,255,0.15)",
  "MM":         "rgba(66,133,244,0.15)",
  "Vision":     "rgba(255,198,90,0.12)",
  "Audio":      "rgba(255,107,107,0.12)",
  "Video":      "rgba(160,120,255,0.12)",
  "Translator": "rgba(0,229,192,0.12)",
  "Search":     "rgba(0,174,192,0.12)",
  "Agent":      "rgba(255,198,90,0.12)",
  "Legal":      "rgba(0,0,0,0.08)",
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function enrichModelWithGemini(hfModel: any, category: string): Promise<{ generalDesc: string; businessHelp: string }> {
  const modelId = hfModel.id;
  
  if (enrichmentCache[modelId]) return enrichmentCache[modelId];

  const author = modelId.split('/')[0] || "Comunidad";
  let generalDesc = `${hfModel.pipeline_tag || 'Modelo'} destacado de ${author} con ${hfModel.downloads?.toLocaleString() || 0} descargas.`;
  let businessHelp = "Este modelo permite automatizar tareas complejas y optimizar procesos de negocio mediante IA avanzada.";

  // Si no hay API key o cliente, usamos fallback
  if (!ai || !geminiKey) return { generalDesc, businessHelp };

  try {
    // Añadimos un pequeño delay de 500ms para evitar picos de cuota (RPM)
    await delay(500);

    const prompt = `Analiza el modelo de IA "${modelId}" de HuggingFace para la categoría "${category}".
Responde ÚNICAMENTE con un JSON válido (sin markdown ni explicaciones):
{
  "generalDesc": "Una frase técnica breve sobre este modelo (máx 15 palabras)",
  "businessHelp": "Dos frases sobre cómo ahorra tiempo o dinero a una empresa real (máx 40 palabras)"
}`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Usamos 1.5-flash para mayor eficiencia
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    if (result.text) {
      const cleanJson = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiData = JSON.parse(cleanJson);
      generalDesc = aiData.generalDesc || generalDesc;
      businessHelp = aiData.businessHelp || businessHelp;
      
      // Guardar en caché solo si la respuesta es válida
      enrichmentCache[modelId] = { generalDesc, businessHelp };
    }
  } catch (error: any) {
    // Si es un error de cuota (429), simplemente logueamos un aviso y devolvemos fallback
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn(`[Gemini Quota] Límite alcanzado, usando fallback para ${modelId}`);
    } else {
      console.warn(`[Gemini Error] ${modelId}:`, error);
    }
  }

  return { generalDesc, businessHelp };
}

export async function fetchTopModelsFromHF(category: string): Promise<DynamicModel[]> {
  try {
    const response = await fetch(`/api/models?category=${encodeURIComponent(category)}`);
    
    if (!response.ok) {
      console.error(`[API Error] ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const color = CATEGORY_COLORS[category] ?? "rgba(108,99,255,0.1)";
    const enrichedResult: DynamicModel[] = [];

    // Procesamos secuencialmente para no exceder cuotas de la API de Gemini
    for (const hfModel of data.slice(0, 5)) {
      const { generalDesc, businessHelp } = await enrichModelWithGemini(hfModel, category);
      
      const modelId = hfModel.id;
      const author = modelId.split('/')[0] || "Comunidad";
      const shortName = modelId.split('/')[1] || modelId;
      
      const rawTags: string[] = hfModel.tags ?? [];
      const cleanTags = rawTags
        .filter(t => !["transformers", "pytorch", "safetensors"].includes(t))
        .slice(0, 3);

      enrichedResult.push({
        id: modelId,
        name: shortName,
        company: author,
        logo: author.charAt(0).toUpperCase(),
        color,
        type: category,
        tags: cleanTags,
        generalDesc,
        businessHelp,
        context: hfModel.pipeline_tag || "IA Hub",
        year: new Date().getFullYear().toString(),
        likes: hfModel.likes || 0,
        downloads: hfModel.downloads || 0
      });
    }

    return enrichedResult;
  } catch (error) {
    console.error("[HF Service] Error general:", error);
    return [];
  }
}
