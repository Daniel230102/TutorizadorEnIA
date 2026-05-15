import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const app = express();
app.use(express.json());

const hfToken = process.env.Api_ProyectoIA;
const geminiKey = process.env.ProyectoIA_API_Key || process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

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
      limit: "10",
    });
    if (config.pipeline_tag) params.set("pipeline_tag", config.pipeline_tag);
    if (config.search) params.set("search", config.search);

    const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;
    
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
    if (!hfData || hfData.length === 0) hfData = await fetchHF(false);
    if (!hfData || !Array.isArray(hfData) || hfData.length === 0) return res.json([]);

    const enrichedResult = await Promise.all(hfData.slice(0, 4).map(async (hfModel) => {
      const modelId = hfModel.id;
      const author = modelId.split('/')[0] || "Comunidad";
      const shortName = modelId.split('/')[1] || modelId;
      
      let generalDesc = `${hfModel.pipeline_tag || 'Modelo'} de ${author}.`;
      let businessHelp = "Solución de IA para optimizar procesos empresariales.";

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Analiza "${modelId}" (${category}). JSON: {"generalDesc":"máx 10 pal","businessHelp":"una frase sobre ahorro"}`;
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          if (responseText) {
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            const aiData = JSON.parse(cleanJson);
            generalDesc = aiData.generalDesc || generalDesc;
            businessHelp = aiData.businessHelp || businessHelp;
          }
        } catch (e) {}
      }

      const rawTags: string[] = hfModel.tags ?? [];
      return {
        id: modelId,
        name: shortName,
        company: author,
        logo: author.charAt(0).toUpperCase(),
        type: category,
        tags: rawTags.filter(t => !["transformers", "pytorch", "safetensors"].includes(t)).slice(0, 3),
        generalDesc,
        businessHelp,
        context: hfModel.pipeline_tag || "IA Hub",
        likes: hfModel.likes || 0,
        downloads: hfModel.downloads || 0
      };
    }));

    res.json(enrichedResult);
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

export default app;
