import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const app = express();
app.use(express.json());

// API Keys from Secrets (user's custom names)
const hfToken = process.env.Api_ProyectoIA;
const geminiKey = process.env.ProyectoIA_API_Key || process.env.GEMINI_API_KEY;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Cache para evitar re-enriquecer frecuentemente
const enrichmentCache: Record<string, { generalDesc: string; businessHelp: string }> = {};

// Health check to verify env vars on Vercel
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hfTokenSet: !!process.env.Api_ProyectoIA,
    geminiKeySet: !!(process.env.ProyectoIA_API_Key || process.env.GEMINI_API_KEY),
    envKeys: Object.keys(process.env).filter(k => k.includes("Proyecto") || k.includes("GEMINI") || k.includes("Api"))
  });
});

// API Proxy for Hugging Face with Enhancement
app.get("/api/models", async (req, res) => {
  const { category } = req.query;
  console.log(`[Backend] Fetching models for category: ${category}`);
  
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
    
    const params = new URLSearchParams({
      sort: "downloads",
      direction: "-1",
      limit: "8",
    });
    if (config.pipeline_tag) params.set("pipeline_tag", config.pipeline_tag);
    if (config.search) params.set("search", config.search);

    const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;
    console.log(`[Backend] HF URL: ${hfUrl}`);
    
    let hfData: any[] = [];
    
    const fetchHF = async (useToken: boolean) => {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      };
      if (useToken && hfToken) {
        headers["Authorization"] = `Bearer ${hfToken}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
      
      try {
        const response = await fetch(hfUrl, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) return await response.json();
        console.warn(`[Backend] HF status ${response.status} (useToken: ${useToken})`);
        return null;
      } catch (e) {
        clearTimeout(timeoutId);
        console.error(`[Backend] HF fetch error (useToken: ${useToken}):`, e);
        return null;
      }
    };

    // Try with token first
    hfData = await fetchHF(true) || [];
    
    // If empty result and we have a token, maybe the token is restricted/bad, try without it
    if (hfData.length === 0 && hfToken) {
      console.log("[Backend] Retrying HF without token...");
      hfData = await fetchHF(false) || [];
    }

    console.log(`[Backend] Resulting models: ${hfData.length}`);

    if (hfData.length === 0) return res.json([]);

    // Enriquecer los modelos con Gemini en paralelo
    const enrichedResult = await Promise.all(hfData.slice(0, 4).map(async (hfModel) => {
      const modelId = hfModel.id;
      const author = modelId.split('/')[0] || "Comunidad";
      const shortName = modelId.split('/')[1] || modelId;
      
      let generalDesc = `${hfModel.pipeline_tag || 'Modelo'} de ${author}.`;
      let businessHelp = "Solución de IA para optimizar procesos empresariales.";

      if (enrichmentCache[modelId]) {
        generalDesc = enrichmentCache[modelId].generalDesc;
        businessHelp = enrichmentCache[modelId].businessHelp;
      } else if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          
          const prompt = `Analiza "${modelId}" (${category}).
Responde JSON:
{
  "generalDesc": "Frase técnica (máx 12 palabras)",
  "businessHelp": "Una frase sobre ahorro de tiempo/dinero"
}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const textBuffer = response.text();

          if (textBuffer) {
            const cleanJson = textBuffer.replace(/```json/g, "").replace(/```/g, "").trim();
            const aiData = JSON.parse(cleanJson);
            generalDesc = aiData.generalDesc || generalDesc;
            businessHelp = aiData.businessHelp || businessHelp;
            enrichmentCache[modelId] = { generalDesc, businessHelp };
          }
        } catch (e: any) {
          // Si falla Gemini, usamos fallback silencioso
        }
      }

      const rawTags: string[] = hfModel.tags ?? [];
      const cleanTags = rawTags
        .filter(t => !["transformers", "pytorch", "safetensors"].includes(t))
        .slice(0, 3);

      return {
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
      };
    }));

    res.json(enrichedResult);
  } catch (error) {
    console.error("Fetch API Error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Serve frontend
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

const PORT = 3000;
if (process.env.VITE_DEV_SERVER !== 'true' && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
