import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
app.use(express.json());

// API Keys from Secrets
const hfToken = process.env.Api_ProyectoIA;

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hfTokenSet: !!process.env.Api_ProyectoIA
  });
});

app.get("/api/models", async (req, res) => {
  try {
    const { category } = req.query;
    
    const CATEGORY_MAP: Record<string, { pipeline_tag?: string; search?: string }> = {
      "LLM":        { pipeline_tag: "text-generation" },
      "MM":         { pipeline_tag: "image-to-text" }, 
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
      limit: "12", // Pedimos mÃ¡s para asegurar que encontramos resultados filtrables
    });
    if (config.pipeline_tag) params.set("pipeline_tag", config.pipeline_tag);
    if (config.search) params.set("search", config.search);

    const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;
    
    // ConfiguraciÃ³n de fetch con reintento y headers robustos
    const fetchHF = async (useToken: boolean) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const headers: Record<string, string> = { 
          "User-Agent": "Mozilla/5.0 (VercelServer; AI-Benchmark-Hub) AppleWebKit/537.36",
          "Accept": "application/json"
        };
        if (useToken && hfToken) headers["Authorization"] = `Bearer ${hfToken}`;
        
        const response = await fetch(hfUrl, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) return await response.json();
        return null;
      } catch (e) {
        clearTimeout(timeoutId);
        return null;
      }
    };

    let hfData = await fetchHF(true);
    // Si falla con token o no hay, intentamos sin Ã©l
    if (!hfData || hfData.length === 0) {
      hfData = await fetchHF(false);
    }

    if (!hfData || !Array.isArray(hfData) || hfData.length === 0) {
      return res.json([]);
    }

    // Retornamos los datos básicos de HuggingFace para que el frontend los enriquezca
    const results = hfData.slice(0, 5).map((hfModel: any) => {
      const modelId = hfModel.id;
      const author = modelId.split('/')[0] || "Comunidad";
      const shortName = modelId.split('/')[1] || modelId;
      const rawTags: string[] = hfModel.tags ?? [];
      
      return {
        id: modelId,
        name: shortName,
        company: author,
        logo: author.charAt(0).toUpperCase(),
        type: category,
        tags: rawTags.filter((t: string) => !["transformers", "pytorch", "safetensors", "license:"].some(ex => t.includes(ex))).slice(0, 3),
        generalDesc: `${hfModel.pipeline_tag || 'Modelo'} de ${author}.`,
        businessHelp: "Cargando sugerencia empresarial...",
        context: hfModel.pipeline_tag || "IA Hub",
        likes: hfModel.likes || 0,
        downloads: hfModel.downloads || 0
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
  }

  const PORT = 3000;
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }
}

startServer();

export default app;
