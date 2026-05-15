import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const hfToken = process.env.Api_ProyectoIA;

  // API Proxy for Hugging Face
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
        limit: "10", // Pedimos un poco más para filtrar
      });
      if (config.pipeline_tag) params.set("pipeline_tag", config.pipeline_tag);
      if (config.search) params.set("search", config.search);

      const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;
      
      const hfResponse = await fetch(hfUrl, {
        headers: hfToken ? { "Authorization": `Bearer ${hfToken}` } : {}
      });
      
      const hfData = await hfResponse.json();
      res.json(hfData);
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
