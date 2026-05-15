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

    return data.map((m: any) => ({
      ...m,
      color,
      year: new Date().getFullYear().toString()
    }));
  } catch (error) {
    console.error("[HF Service] Error general:", error);
    return [];
  }
}
