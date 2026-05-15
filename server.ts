import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Keys from Secrets (user's custom names)
  const hfToken = process.env.Api_ProyectoIA;
  const geminiKey = process.env.ProyectoIA_API_Key || process.env.GEMINI_API_KEY;

  const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

  if (!geminiKey) {
    console.warn("WARNING: No Gemini API Key found (ProyectoIA_API_Key or GEMINI_API_KEY).");
  }

  // Cache para evitar re-enriquecer frecuentemente
  const enrichmentCache: Record<string, { generalDesc: string; businessHelp: string }> = {};

  // API Proxy for Hugging Face with Enhancement
  app.get("/api/models", async (req, res) => {
    const { category } = req.query;
    
    const CATEGORY_MAP: Record<string, { pipeline_tag?: string; search?: string }> = {
      "LLM":        { pipeline_tag: "text-generation" },
      "MM":         { pipeline_tag: "image-text-to-text" },
      "Vision":     { pipeline_tag: "text-to-image" },
      "Audio":      { pipeline_tag: "text-to-speech" },
      "Video":      { pipeline_tag: "text-to-video" },
      "Translator": { pipeline_tag: "translation" },
      "Search":     { pipeline_tag: "sentence-similarity" },
      "Agent":      { search: "agent" },
      "Legal":      { search: "legal" },
    };

    const config = CATEGORY_MAP[category as string] || { pipeline_tag: "text-generation" };
    
    try {
      const params = new URLSearchParams({
        sort: "downloads",
        direction: "-1",
        limit: "10",
      });
      if (config.pipeline_tag) params.set("pipeline_tag", config.pipeline_tag);
      if (config.search) params.set("search", config.search);

      const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;
      
      const hfResponse = await fetch(hfUrl, {
        headers: hfToken ? { "Authorization": `Bearer ${hfToken}` } : {}
      });
      
      const hfData = await hfResponse.json();

      if (!hfData || !Array.isArray(hfData)) return res.json([]);

      // Enriquecer los modelos con Gemini secuencialmente en el backend
      const enrichedResult = [];
      
      for (const hfModel of hfData.slice(0, 5)) {
        const modelId = hfModel.id;
        const author = modelId.split('/')[0] || "Comunidad";
        const shortName = modelId.split('/')[1] || modelId;
        
        let generalDesc = `${hfModel.pipeline_tag || 'Modelo'} destacado de ${author} con ${hfModel.downloads?.toLocaleString() || 0} descargas.`;
        let businessHelp = "Este modelo permite automatizar tareas complejas y optimizar procesos de negocio mediante IA avanzada.";

        if (enrichmentCache[modelId]) {
          generalDesc = enrichmentCache[modelId].generalDesc;
          businessHelp = enrichmentCache[modelId].businessHelp;
        } else if (ai) {
          try {
            const prompt = `Analiza el modelo de IA "${modelId}" de HuggingFace para la categoría "${category}".
Responde ÚNICAMENTE con un JSON válido:
{
  "generalDesc": "Una frase técnica breve sobre este modelo (máx 15 palabras)",
  "businessHelp": "Dos frases sobre cómo ahorra tiempo o dinero a una empresa real (máx 40 palabras)"
}`;

            const result = await ai.models.generateContent({
              model: "gemini-1.5-flash",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: { responseMimeType: "application/json" }
            });

            if (result.text) {
              const cleanJson = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
              const aiData = JSON.parse(cleanJson);
              generalDesc = aiData.generalDesc || generalDesc;
              businessHelp = aiData.businessHelp || businessHelp;
              enrichmentCache[modelId] = { generalDesc, businessHelp };
            }
          } catch (e: any) {
            console.warn(`Error enriqueciendo ${modelId}:`, e.message || e);
          }
        }

        const rawTags: string[] = hfModel.tags ?? [];
        const cleanTags = rawTags
          .filter(t => !["transformers", "pytorch", "safetensors"].includes(t))
          .slice(0, 3);

        enrichedResult.push({
          id: modelId,
          name: shortName,
          company: author,
          logo: author.charAt(0).toUpperCase(),
          type: category,
          tags: cleanTags,
          generalDesc,
          businessHelp,
          context: hfModel.pipeline_tag || "IA Hub",
          likes: hfModel.likes || 0,
          downloads: hfModel.downloads || 0
        });
      }

      res.json(enrichedResult);
    } catch (error) {
      console.error("Hugging Face API Error:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
