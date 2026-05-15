import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Menu, X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchTopModelsFromHF, DynamicModel } from './services/aiModelService';
import { enrichModelData } from './services/geminiService';

// --- UTILS ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// --- DATA ---

const MODELS = [
  { 
    id: 'gpt4o', 
    name: 'GPT-4o', 
    company: 'OpenAI', 
    logo: '🟢', 
    color: 'rgba(16,163,127,0.15)', 
    type: 'MM', 
    tags: ['Atención Cliente','Multimodal','Visión'], 
    generalDesc: 'Modelo multimodal nativo optimizado para interacciones humanas de baja latencia a través de voz, visión y texto.',
    businessHelp: 'Ideal para crear agentes de atención al cliente virtuales con calidez humana que pueden "ver" a través de la cámara del usuario para resolver problemas técnicos complejos o guiar en procesos de onboarding en tiempo real.',
    context: '128K', 
    year: '2026' 
  },
  { 
    id: 'claude35', 
    name: 'Claude 3.5 Sonnet', 
    company: 'Anthropic', 
    logo: '🟣', 
    color: 'rgba(108,99,255,0.15)', 
    type: 'LLM', 
    tags: ['Auditoría','Código','Lógica'], 
    generalDesc: 'Líder en razonamiento de grado humano y generación de código, con una ventana de contexto de 200K tokens equilibrada.',
    businessHelp: 'La mejor opción para ingeniería de software y análisis legal. Su baja tasa de alucinaciones permite automatizar la revisión de cumplimiento normativo y la migración de bases de código legadas con una precisión técnica sin precedentes.',
    context: '200K', 
    year: '2026' 
  },
  { 
    id: 'gemini', 
    name: 'Gemini 1.5 Pro', 
    company: 'Google', 
    logo: '🔵', 
    color: 'rgba(66,133,244,0.15)', 
    type: 'MM', 
    tags: ['Big Data','Análisis Documental','Vídeo'], 
    generalDesc: 'Modelo multimodal de Google con una ventana de contexto masiva de hasta 2 millones de tokens.',
    businessHelp: 'Permite a las empresas cargar bibliotecas documentales completas, grabaciones de video de horas o bases de datos masivas. Es el único modelo capaz de razonar sobre todo el conocimiento acumulado de una organización en una sola consulta.',
    context: '2M', 
    year: '2026' 
  },
  { 
    id: 'llama3', 
    name: 'Llama 3.1 405B', 
    company: 'Meta', 
    logo: '🦙', 
    color: 'rgba(24,119,242,0.12)', 
    type: 'Agent', 
    tags: ['Seguridad','On-premise','Privacidad'], 
    generalDesc: 'El modelo de código abierto más potente del mundo, diseñado para competir frontalmente con GPT-4o en capacidades de razonamiento.',
    businessHelp: 'Fundamental para la soberanía de datos. Permite a las corporaciones desplegar su propia instancia de IA de clase mundial en centros de datos locales (On-premise), evitando que la información sensible sea procesada por proveedores externos.',
    context: '128K', 
    year: '2026' 
  },
  { 
    id: 'mistral', 
    name: 'Mistral Large 2', 
    company: 'Mistral AI', 
    logo: '🌪️', 
    color: 'rgba(255,107,107,0.1)', 
    type: 'LLM', 
    tags: ['Soberanía','Eficiencia','Multilingüe'], 
    generalDesc: 'Modelo europeo de vanguardia diseñado para la eficiencia multilingüe y el razonamiento lógico avanzado.',
    businessHelp: 'Optimiza los costes operativos en Europa gracias a su cumplimiento nativo de RGPD. Excelente para la extracción de datos estructurados de facturas y la clasificación de gran volumen de comunicaciones en múltiples idiomas europeos.',
    context: '128K', 
    year: '2026' 
  },
  { 
    id: 'midjourney', 
    name: 'Midjourney v6', 
    company: 'Midjourney', 
    logo: '🖼️', 
    color: 'rgba(195,195,195,0.15)', 
    type: 'Vision', 
    tags: ['Marketing','Diseño','Prototipado'], 
    generalDesc: 'El referente en síntesis de imágenes de alta fidelidad, fotorrealismo y coherencia compositiva.',
    businessHelp: 'Revoluciona el marketing y el diseño de producto. Permite generar campañas visuales, renders de arquitectura y prototipos estéticos en minutos, reduciendo los costes de producción fotográfica en más de un 80%.',
    context: 'N/A', 
    year: '2026' 
  },
  { 
    id: 'perplexity', 
    name: 'Perplexity Enterprise', 
    company: 'Perplexity', 
    logo: '🔍', 
    color: 'rgba(0,174,192,0.1)', 
    type: 'Search', 
    tags: ['Investigación','Real-time','Fuentes'], 
    generalDesc: 'Sistema de respuesta basado en recuperación web en tiempo real que combina búsqueda semántica con modelos de lenguaje.',
    businessHelp: 'Acelera la toma de decisiones estratégicas proporcionando resúmenes de mercado e investigación de competencia con citas directas a fuentes verificadas, eliminando la incertidumbre de los datos desactualizados.',
    context: '128K', 
    year: '2026' 
  },
  { 
    id: 'deepl', 
    name: 'DeepL Write & Translate', 
    company: 'DeepL', 
    logo: '📖', 
    color: 'rgba(15,44,79,0.1)', 
    type: 'Translator', 
    tags: ['Globalización','Traducción','Marca'], 
    generalDesc: 'La suite más precisa del mundo para la traducción y refinamiento de estilo basada en redes neuronales profundas.',
    businessHelp: 'Garantiza la consistencia de la marca global. Sus glosarios terminológicos permiten que las traducciones técnicas y legales sean coherentes con la cultura corporativa en más de 30 mercados internacionales.',
    context: 'N/A', 
    year: '2026' 
  },
  { 
    id: 'eleven', 
    name: 'ElevenLabs', 
    company: 'ElevenLabs', 
    logo: '🗣️', 
    color: 'rgba(255,200,0,0.1)', 
    type: 'Audio', 
    tags: ['Branding','Voz','Contenido'], 
    generalDesc: 'Tecnología líder en síntesis de voz (TTS) y clonación vocal con una naturalidad indistinguible de la humana.',
    businessHelp: 'Permite la localización instantánea de videos informativos y formación interna. Las empresas pueden "clonar" la voz de sus líderes para locutar contenido corporativo global en múltiples idiomas manteniendo la identidad sonora de la marca.',
    context: 'N/A', 
    year: '2026' 
  },
  { 
    id: 'heygen', 
    name: 'HeyGen', 
    company: 'HeyGen', 
    logo: '👤', 
    color: 'rgba(255,107,107,0.1)', 
    type: 'Video', 
    tags: ['Avatares','Marketing','Formación'], 
    generalDesc: 'Plataforma líder en generación de vídeos con avatares fotorrealistas y sincronización labial perfecta.',
    businessHelp: 'Elimina la necesidad de cámaras y platós. Permite crear vídeos corporativos, de formación y de ventas simplemente escribiendo un texto, con avatares que hablan con naturalidad y expresividad humana.',
    context: 'N/A', 
    year: '2026' 
  },
  { 
    id: 'runway', 
    name: 'Runway Gen-3 Alpha', 
    company: 'Runway', 
    logo: '🎬', 
    color: 'rgba(108,99,255,0.1)', 
    type: 'Video', 
    tags: ['Cine','Ads','VFX'], 
    generalDesc: 'Modelo de generación de vídeo de alta fidelidad capaz de crear escenas cinematográficas complejas desde texto.',
    businessHelp: 'Transforma el departamento creativo permitiendo generar activos de vídeo de alta calidad para redes sociales, anuncios y prototipado visual en segundos, reduciendo drásticamente los tiempos de post-producción.',
    context: 'N/A', 
    year: '2026' 
  },
  { 
    id: 'harvey', 
    name: 'Harvey AI', 
    company: 'Harvey', 
    logo: '⚖️', 
    color: 'rgba(0,0,0,0.05)', 
    type: 'Legal', 
    tags: ['Compliance','Legal','Due Diligence'], 
    generalDesc: 'Plataforma de inteligencia artificial verticalizada construida específicamente para el sector legal y fiscal.',
    businessHelp: 'El socio digital para firmas de abogados y departamentos fiscales. Automatiza el "Legal Discovery", la gestión de litigios y el análisis de "Due Diligence", permitiendo a los profesionales enfocarse en la estrategia jurídica en lugar de la revisión manual.',
    context: '128K', 
    year: '2026' 
  }
];

const AGENTIC = [
  { 
    id: 'devin', 
    name: 'Ingeniería Autónoma', 
    full: 'Sistemas estilo Devin / OpenDevin', 
    icon: '💻', 
    color: 'rgba(108,99,255,0.15)', 
    desc: 'Agentes capaces de comportarse como un ingeniero de software autónomo. No solo sugieren código, sino que abren su propio terminal, navegan por internet para leer documentación, crean repositorios y despliegan aplicaciones reales de principio a fin.', 
    flow: ['Recibir Objetivo', 'Planificar Arquitectura', 'Ejecución en Terminal/Browser', 'Auto-corrección de Errores', 'Despliegue Final'], 
    uses: ['Desarrollo de microservicios desde cero', 'Migración automática de librerías legacy', 'Debugging autónomo de sistemas complejos'] 
  },
  { 
    id: 'multi', 
    name: 'Equipos Multi-Agente', 
    full: 'Orquestación (CrewAI / LangGraph)', 
    icon: '🕸️', 
    color: 'rgba(0,229,192,0.1)', 
    desc: 'Arquitecturas donde varios agentes con roles especializados colaboran entre sí. Un "Agente Investigador" recolecta datos, un "Agente Analista" extrae conclusiones y un "Agente Escritor" genera el informe, todo supervisado por un agente "Manager".', 
    flow: ['División de Tareas', 'Asignación a Especialistas', 'Comunicación Inter-Agente', 'Consolidación de Resultados', 'Informe Maestro'], 
    uses: ['Gestión de campañas de marketing 360', 'Análisis de riesgos financieros globales', 'Soporte al cliente de nivel 3'] 
  },
  { 
    id: 'action', 
    name: 'Agentes de Acción', 
    full: 'Sistemas ReAct con Tools', 
    icon: '⚡', 
    color: 'rgba(255,198,90,0.12)', 
    desc: 'Sistemas que utilizan el ciclo "Razonamiento + Acción". Son agentes que tienen permiso para entrar en el navegador del usuario, enviar correos, agendar reuniones en calendarios o manipular hojas de cálculo de forma lógica.', 
    flow: ['Análisis del Objetivo', 'Selección de Herramienta', 'Uso de Herramienta (API/UI)', 'Validación de Resultado', 'Acción Siguiente'], 
    uses: ['Automatización de procesos de venta (Prospecting)', 'Gestión inteligente de calendarios', 'Extracción de datos en tiempo real'] 
  },
  { 
    id: 'research', 
    name: 'Investigación Autónoma', 
    full: 'Research Agents (GPT Researcher)', 
    icon: '🔍', 
    color: 'rgba(255,107,107,0.1)', 
    desc: 'Agentes diseñados para realizar investigaciones de mercado profundas. Pueden leer cientos de sitios web simultáneamente, comparar precios, analizar sentimientos de usuarios y generar documentos técnicos citando cada fuente encontrada.', 
    flow: ['Pregunta Compleja', 'Búsqueda Masiva Web', 'Filtrado de Calidad', 'Síntesis Estructurada', 'Documento Final Citado'], 
    uses: ['Investigación de competencia en tiempo real', 'Análisis de tendencias de mercado diarias', 'Debida diligencia (Due Diligence)'] 
  }
];

const SKILLS_LIST = [
  {
    title: "Skill: Auditor de Riesgos Legales",
    icon: "⚖️",
    desc: "Habilidad para leer contratos y detectar cláusulas peligrosas automáticamente. En lugar de leer todo el texto, la IA busca activamente puntos críticos predefinidos.",
    example: "INSTRUCCIÓN DE SKILL:\n1. Analiza el contrato buscando: 'Penalizaciones por demora', 'Jurisdicción' y 'Causa de rescisión'.\n2. Para cada punto, clasifica el riesgo como [BAJO, MEDIO, ALTO].\n3. Si la jurisdicción no es España, genera una alerta roja inmediata."
  },
  {
    title: "Skill: Extractor Contable JSON",
    icon: "💰",
    desc: "Esta skill obliga a la IA a comportarse como un procesador de datos puro, eliminando la charla y entregando solo datos estructurados listos para importar a un ERP.",
    example: "INSTRUCCIÓN DE SKILL:\nActúa como un extractor de datos JSON. No saludes ni expliques nada.\nExtrae exclusivamente estos campos de la factura:\n- CIF_EMISOR (formato string)\n- BASE_IMPONIBLE (formato float)\n- TOTAL_CON_IVA (formato float)\nSi falta un dato, pon 'null'."
  },
  {
    title: "Skill: Clasificador de Soporte N1",
    icon: "💬",
    desc: "Permite que la IA filtre los correos de clientes y los asigne al departamento correcto antes de que un humano los lea.",
    example: "INSTRUCCIÓN DE SKILL:\nLee el ticket del cliente y clasifícalo en una de estas categorías:\n[FACTURACIÓN] -> Si pide facturas o hay problemas de pago.\n[TÉCNICO] -> Si algo no funciona o hay errores de software.\n[VENTAS] -> Si pide precios o planes.\nDevuelve solo la etiqueta y un resumen de 5 palabras."
  },
  {
    title: "Skill: Revisor de Tono de Marca",
    icon: "📄",
    desc: "Asegura que cualquier texto escrito por la IA o por empleados cumple con la identidad de la empresa (formal, cercano, técnico).",
    example: "INSTRUCCIÓN DE SKILL:\nTu tono debe ser: 'Profesional, empático y directo'.\nREGLAS DE ORO:\n- Nunca uses 'Querido cliente', usa 'Hola [Nombre]'.\n- No uses tecnicismos si el usuario es nivel principiante.\n- Siempre termina con una pregunta de ayuda adicional."
  },
  {
    title: "Skill: Generador de Consultas SQL",
    icon: "🛠️",
    desc: "Habilidad para que perfiles no técnicos obtengan datos de la base de datos empresarial formulando preguntas en lenguaje natural.",
    example: "INSTRUCCIÓN DE SKILL:\nUsa este esquema de tabla: 'Ventas (ID, Fecha, Importe, Vendedor_ID)'.\nCuando el usuario pregunte, genera la consulta SQL nativa.\nREGLA: Solo usa SELECT. No permitas DELETE o DROP por seguridad."
  },
  {
    title: "Skill: Analista de Sentiment de Mercado",
    icon: "🚀",
    desc: "Procesa masivamente comentarios o noticias para medir el impacto de la marca en comparación con la competencia.",
    example: "INSTRUCCIÓN DE SKILL:\nAnaliza el sentimiento de este lote de 50 comentarios.\n1. Puntuación de -100 a +100.\n2. Identifica el 'Pain Point' (dolor) principal que se repite.\n3. Compara si mencionan a 'Competidor X' de forma positiva o negativa."
  }
];

// PREGUNTAS MEJORADAS — más desafiantes, distractores plausibles, umbral porcentual
const QUESTIONS = [
  { 
    q: "¿Qué diferencia técnica distingue a RAG del fine-tuning para incorporar conocimiento privado?", 
    options: ["RAG modifica los pesos del modelo; fine-tuning usa retrieval externo", "RAG recupera información en tiempo de inferencia; fine-tuning la incorpora en el entrenamiento", "Ambas técnicas son equivalentes en coste y resultado", "RAG solo funciona con modelos open-source"], 
    correct: 1, 
    explanation: "RAG recupera documentos relevantes en tiempo de inferencia sin tocar el modelo. Fine-tuning ajusta los pesos del modelo mediante un proceso de entrenamiento adicional con datos específicos." 
  },
  { 
    q: "Un modelo con temperatura = 0 generará respuestas...", 
    options: ["Más creativas y diversas en cada ejecución", "Deterministas y altamente reproducibles", "Más rápidas por menor cómputo", "Más largas al explorar más opciones"], 
    correct: 1, 
    explanation: "Temperatura 0 hace que el modelo seleccione siempre el token más probable, produciendo respuestas deterministas y repetibles. Valores altos aumentan la aleatoriedad y creatividad." 
  },
  { 
    q: "¿Cuál es el principal riesgo de exponer una API Key en el código frontend de una aplicación?", 
    options: ["Que el modelo responda más lento", "Que terceros puedan hacer peticiones a costa de tu cuenta", "Que el modelo cambie de idioma", "Que los prompts sean más cortos"], 
    correct: 1, 
    explanation: "Una API key visible en el bundle de JavaScript puede ser extraída por cualquier usuario, permitiendo que hagan peticiones en tu nombre y agoten tu crédito o accedan a datos sensibles." 
  },
  { 
    q: "¿Qué ventaja ofrece una arquitectura Multi-Agente frente a un único LLM para tareas complejas?", 
    options: ["Los agentes son siempre más baratos que un solo modelo", "Permite especialización de roles, paralelización y revisión cruzada entre agentes", "Un agente puede acceder a más tokens de contexto", "Elimina completamente las alucinaciones"], 
    correct: 1, 
    explanation: "Los sistemas multi-agente permiten dividir el problema entre especialistas (investigador, analista, escritor), ejecutar tareas en paralelo y que un agente revise el trabajo de otro, mejorando calidad y eficiencia." 
  },
  { 
    q: "¿Qué significa que Gemini 1.5 Pro tenga una ventana de contexto de 2M tokens?", 
    options: ["Puede generar hasta 2 millones de palabras de respuesta", "Puede procesar simultáneamente ~1.500 páginas de texto en una sola consulta", "Tiene 2 millones de parámetros entrenables", "Puede recordar 2 millones de conversaciones anteriores"], 
    correct: 1, 
    explanation: "La ventana de contexto define cuánta información puede recibir el modelo de una vez. 2M tokens equivalen aproximadamente a 1.500 páginas de texto, permitiendo analizar documentos o bases de código completos." 
  },
  { 
    q: "En Chain-of-Thought (CoT) prompting, ¿cuál es el mecanismo que mejora la precisión?", 
    options: ["El modelo hace varias consultas en paralelo y promedia resultados", "Forzar al modelo a externalizar pasos intermedios de razonamiento antes de la respuesta final", "Se añaden más ejemplos al dataset de entrenamiento", "Se aumenta la temperatura para explorar más soluciones"], 
    correct: 1, 
    explanation: "CoT instruye al modelo a mostrar su razonamiento paso a paso. Esto reduce errores al obligar al modelo a construir lógica explícita antes de dar una respuesta, especialmente en matemáticas y lógica." 
  },
  { 
    q: "¿Por qué un modelo open-source como Llama 3.1 on-premise es preferible en sectores regulados?", 
    options: ["Porque es más potente que cualquier modelo propietario", "Porque los datos nunca salen de la infraestructura propia, cumpliendo RGPD y normativas sectoriales", "Porque no requiere GPU para funcionar", "Porque tiene contexto ilimitado"], 
    correct: 1, 
    explanation: "En sectores como banca, salud o gobierno, la normativa exige que ciertos datos no salgan de la infraestructura controlada. Un modelo local garantiza que ningún dato se envía a APIs de terceros." 
  },
  { 
    q: "¿Qué es un embedding en el contexto de sistemas RAG?", 
    options: ["Un formato de compresión de imágenes para reducir almacenamiento", "Una representación numérica densa que captura el significado semántico de un texto", "El proceso de dividir un documento en fragmentos más pequeños", "Un tipo de fine-tuning rápido y económico"], 
    correct: 1, 
    explanation: "Un embedding es un vector numérico (ej. 1536 dimensiones) que representa el significado de un texto. Textos semánticamente similares tendrán vectores cercanos en el espacio, lo que permite búsqueda por significado." 
  },
  { 
    q: "¿Cuál es la diferencia entre un 'hallucination' y un error factual común en un LLM?", 
    options: ["Las alucinaciones son siempre más graves que los errores factuales", "En una alucinación el modelo inventa información con total confianza; en un error puede dudar o indicar incertidumbre", "Son exactamente lo mismo, solo distinto nombre", "Las alucinaciones solo ocurren en modelos open-source"], 
    correct: 1, 
    explanation: "Una alucinación es cuando el modelo genera información falsa de forma convincente y con alta confianza, sin indicar ninguna duda. Es especialmente peligroso porque el output parece completamente plausible." 
  },
  { 
    q: "¿Qué es el 'System Prompt' y qué ventaja tiene sobre instrucciones en el mensaje del usuario?", 
    options: ["Es el primer mensaje que el usuario envía al modelo", "Es un canal de instrucciones privilegiado, invisible para el usuario, que define el comportamiento base del modelo", "Es la configuración de la GPU donde corre el modelo", "Es el nombre técnico del histórico de conversación"], 
    correct: 1, 
    explanation: "El System Prompt es una instrucción especial que se inyecta antes de la conversación, con mayor peso que los mensajes de usuario. Define el rol, las restricciones, el tono y las skills del modelo para toda la sesión." 
  },
  { 
    q: "¿Qué framework permite definir 'flujos de agentes como grafos de estado' con bifurcaciones condicionales?", 
    options: ["CrewAI, especializado en roles de agentes en paralelo", "LangGraph, que modela flujos como grafos dirigidos con estados", "AutoGPT, el primer agente autónomo publicado", "Llama Index, especializado en ingesta de documentos"], 
    correct: 1, 
    explanation: "LangGraph extiende LangChain modelando el flujo de un agente como un grafo dirigido. Permite crear bucles, bifurcaciones condicionales y puntos de control humano (HITL), fundamental para pipelines empresariales complejos." 
  },
  { 
    q: "¿Qué técnica de prompting consiste en incluir ejemplos de entrada-salida dentro del prompt?", 
    options: ["Zero-shot: sin ejemplos, confiando en el preentrenamiento del modelo", "Few-shot: incluir 2-5 ejemplos de input/output para que el modelo aprenda el patrón", "Chain-of-Thought: mostrar el razonamiento paso a paso", "Constitutional AI: usar principios éticos como restricciones"], 
    correct: 1, 
    explanation: "Few-shot learning proporciona al modelo ejemplos concretos del formato de entrada y salida esperado. Esto calibra el modelo hacia el patrón deseado sin necesidad de fine-tuning, siendo muy efectivo para tareas estructuradas." 
  },
  { 
    q: "¿Por qué Mistral Large es especialmente relevante para empresas europeas?", 
    options: ["Porque es el modelo con mayor ventana de contexto del mercado", "Porque es de origen europeo con cumplimiento RGPD nativo y excelente rendimiento multilingüe", "Porque es el único modelo gratuito para uso empresarial", "Porque no requiere conexión a internet"], 
    correct: 1, 
    explanation: "Mistral AI es una empresa francesa. Sus modelos se diseñan con las exigencias del RGPD europeo en mente, ofrecen despliegue en infraestructura europea y destacan en idiomas europeos, siendo clave para cumplimiento normativo." 
  },
  { 
    q: "¿Qué herramienta permite a un agente ReAct obtener información actualizada que no tiene en su entrenamiento?", 
    options: ["Aumentar la temperatura del modelo para explorar más respuestas posibles", "Tool Use: llamadas a APIs externas como buscadores web o bases de datos en tiempo real", "Aumentar el tamaño del contexto a 1 millón de tokens", "Re-entrenar el modelo con datos nuevos diariamente"], 
    correct: 1, 
    explanation: "El Tool Use (uso de herramientas) permite al agente llamar a APIs externas durante la inferencia. Un agente ReAct puede buscar en internet, consultar una base de datos o ejecutar código para obtener información actualizada." 
  },
  { 
    q: "¿Cuál es el principal coste operativo oculto del fine-tuning frente al prompting en producción?", 
    options: ["El prompting requiere más tokens por consulta que un modelo fine-tuneado", "El fine-tuning requiere reentrenamiento cada vez que cambian los datos o requisitos del negocio", "El prompting es siempre menos preciso que el fine-tuning para cualquier tarea", "No hay diferencia de coste significativa entre ambas aproximaciones"], 
    correct: 1, 
    explanation: "El fine-tuning es un snapshot estático: si los datos, el producto o las reglas del negocio cambian, hay que reentrenar. El prompting es dinámico: cambiar el system prompt es instantáneo y sin coste de entrenamiento." 
  },
  { 
    q: "¿Qué significa 'soberanía de datos' en el contexto de adopción de IA empresarial?", 
    options: ["Que la empresa es propietaria del modelo de IA que usa", "Que los datos procesados no salen de la infraestructura controlada por la empresa", "Que la empresa puede vender los datos a terceros libremente", "Que el modelo solo responde en el idioma local de la empresa"], 
    correct: 1, 
    explanation: "Soberanía de datos significa que la empresa mantiene control total sobre dónde se procesan y almacenan sus datos. Con modelos en APIs de terceros, los datos viajan a servidores externos; con modelos on-premise, no." 
  },
  { 
    q: "¿Qué ventaja técnica ofrece NotebookLM para la formación corporativa?", 
    options: ["Genera vídeos con avatares fotorrealistas automáticamente", "Convierte fuentes documentales propias en podcasts interactivos y resúmenes de audio con IA", "Es un LLM especializado en documentación técnica de código", "Permite fine-tunear modelos sin conocimientos de programación"], 
    correct: 1, 
    explanation: "NotebookLM de Google permite subir documentos propios (PDFs, presentaciones, textos) y genera automáticamente resúmenes, podcasts de audio conversacional y responde preguntas basándose exclusivamente en esas fuentes." 
  },
  { 
    q: "¿Qué es el 'context window poisoning' y por qué es relevante en sistemas agénticos?", 
    options: ["Un ataque en el que se insertan instrucciones maliciosas en documentos que el agente procesa", "Un error de memoria RAM que afecta la velocidad del modelo", "El fenómeno por el que los modelos olvidan el inicio de una conversación larga", "Una técnica para reducir el coste de tokens en consultas largas"], 
    correct: 0, 
    explanation: "El context window poisoning (o prompt injection) es un riesgo de seguridad donde documentos procesados por un agente contienen instrucciones ocultas que manipulan su comportamiento. Crítico en sistemas que procesan contenido de terceros." 
  },
  { 
    q: "¿Cómo mejora la precisión de un sistema RAG el 'chunking semántico' frente al chunking por caracteres?", 
    options: ["Divide los documentos en trozos del mismo tamaño para indexación uniforme", "Divide el texto respetando límites de significado (párrafos, secciones), preservando contexto coherente en cada chunk", "Comprime cada chunk para reducir el coste de almacenamiento vectorial", "Elimina automáticamente los chunks de baja relevancia antes de indexar"], 
    correct: 1, 
    explanation: "El chunking por caracteres puede cortar frases a la mitad, creando fragmentos sin sentido. El chunking semántico respeta la estructura del texto, asegurando que cada fragmento indexado sea coherente y recuperable con precisión." 
  },
  { 
    q: "En una arquitectura de agentes empresarial, ¿qué rol cumple el 'orquestador'?", 
    options: ["Ejecuta directamente todas las herramientas disponibles en paralelo", "Recibe el objetivo de alto nivel, lo descompone en subtareas y las delega a agentes especializados", "Es el agente con mayor ventana de contexto del sistema", "Gestiona la autenticación y seguridad de las APIs externas"], 
    correct: 1, 
    explanation: "El orquestador es el agente manager: recibe el objetivo global, planifica la estrategia, divide el trabajo en subtareas coherentes y las asigna a los agentes especialistas adecuados, coordinando y consolidando los resultados." 
  }
];

const VIDEOS = [
  { title: '¿Qué es un LLM?', cat: 'Fundamentos', dur: '12 min', emoji: '🧠', desc: 'Explicación accesible de cómo funcionan los Large Language Models, tokens y generación de texto.' },
  { title: 'RAG paso a paso', cat: 'Agéntico', dur: '15 min', emoji: '📚', desc: 'Implementación práctica de Retrieval-Augmented Generation con ejemplos empresariales reales.' },
  { title: 'Prompting para Business', cat: 'Skills', dur: '14 min', emoji: '🎯', desc: 'Las técnicas de prompting más efectivas para mejorar resultados en entornos corporativos.' },
  { title: 'IA en producción', cat: 'Empresa', dur: '16 min', emoji: '🔒', desc: 'Seguridad, gobernanza y cumplimiento normativo al desplegar IA en la empresa.' },
  { title: 'Multi-Agentes con CrewAI', cat: 'Agéntico', dur: '20 min', emoji: '🕸️', desc: 'Tutorial práctico para crear tu primer equipo de agentes IA para automatizar procesos.' },
  { title: 'NotebookLM Tutorial', cat: 'Herramientas', dur: '10 min', emoji: '🎬', desc: 'Cómo usar NotebookLM para crear formación corporativa y podcasts desde tus documentos.' }
];

export default function App() {
  // FIX: Tema inicial basado en preferencia del sistema (evita flash al cargar)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [page, setPage] = useState('home');
  const [filter, setFilter] = useState('Todos');
  const [activeAgent, setActiveAgent] = useState(AGENTIC[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpModel, setHelpModel] = useState<any | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<DynamicModel[]>([]);
  const [isLoadingHF, setIsLoadingHF] = useState(false);
  // FIX: estado de error HF para mostrar feedback visible al usuario
  const [hfError, setHfError] = useState<string | null>(null);

  // Quiz states
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState<typeof QUESTIONS>([]);

  // FIX: Aplicar tema al DOM en el primer render también, no solo en cambios
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // FIX: Cargar HF también cuando filter === 'Todos' se cambia a otro, y mostrar error si falla
  useEffect(() => {
    if (page === 'models' && filter !== 'Todos') {
      setHfError(null);
      const loadHF = async () => {
        setIsLoadingHF(true);
        setDynamicModels([]);
        try {
          const models = await fetchTopModelsFromHF(filter);
          if (models.length === 0) {
            setHfError(`No se encontraron modelos en HuggingFace para la categoría "${filter}". Mostrando solo modelos curados.`);
          }
          setDynamicModels(models);

          // Enriquecimiento asíncrono uno a uno para no bloquear
          models.forEach(async (m) => {
            const enriched = await enrichModelData(m.id, filter);
            if (enriched) {
              setDynamicModels(current => current.map(item => 
                item.id === m.id ? { ...item, ...enriched } : item
              ));
            }
          });

        } catch (err) {
          setHfError('No se pudo conectar con HuggingFace Hub. Comprueba tu conexión o inténtalo de nuevo.');
          setDynamicModels([]);
        } finally {
          setIsLoadingHF(false);
        }
      };
      loadHF();
    } else {
      setDynamicModels([]);
      setHfError(null);
    }
  }, [filter, page]);

  const toggleTheme = () => setTheme((prev: 'light' | 'dark') => prev === 'light' ? 'dark' : 'light');

  const filteredModels = useMemo(() =>
    filter === 'Todos' ? MODELS : MODELS.filter(m => m.type === filter),
    [filter]
  );

  const handlePage = (id: string) => {
    if (id === 'videos') {
      setVideoModalOpen(true);
      setMenuOpen(false);
      return;
    }
    setPage(id);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const startQuiz = () => {
    const shuffledQs = shuffleArray(QUESTIONS).slice(0, 20).map(q => {
      const correctText = q.options[q.correct];
      const shuffledOptions = shuffleArray([...q.options]);
      return {
        ...q,
        options: shuffledOptions,
        correct: shuffledOptions.indexOf(correctText)
      };
    });
    setRandomizedQuestions(shuffledQs);
    setQuizStep(0);
    setScore(0);
    setQuizDone(false);
    setSelectedAnswer(null);
    setQuizOpen(true);
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === randomizedQuestions[quizStep].correct) setScore((s: number) => s + 1);
  };

  const nextQuestion = () => {
    if (quizStep < randomizedQuestions.length - 1) {
      setQuizStep((s: number) => s + 1);
      setSelectedAnswer(null);
    } else {
      setQuizDone(true);
    }
  };

  const closeQuiz = () => { setQuizOpen(false); };

  // FIX: Cálculo de resultado por porcentaje, no por valor absoluto
  const getQuizResult = (sc: number, total: number) => {
    const pct = Math.round((sc / total) * 100);
    if (pct >= 85) return { msg: '¡Excelente! Dominas los conceptos clave de IA corporativa. 🚀', color: 'var(--c-accent2)' };
    if (pct >= 65) return { msg: 'Buen nivel. Repasa los temas donde fallaste para afianzar el conocimiento. 👍', color: 'var(--c-amber)' };
    return { msg: 'Te recomendamos revisar las secciones de Modelos, Sistemas Agénticos y Skills. 📚', color: 'var(--c-accent3)' };
  };

  return (
    <>
      <nav>
        <div className="logo" onClick={() => handlePage('home')} style={{ cursor: 'pointer' }}>AI<span>GEN</span></div>

        <div className={`nav-links ${menuOpen ? 'mobile-show' : ''}`}>
          <button className={page === 'home' ? 'active' : ''} onClick={() => handlePage('home')}>Inicio</button>
          <button className={page === 'models' ? 'active' : ''} onClick={() => handlePage('models')}>Modelos IA</button>
          <button className={page === 'agentic' ? 'active' : ''} onClick={() => handlePage('agentic')}>Sistemas Agénticos</button>
          <button className={page === 'skills' ? 'active' : ''} onClick={() => handlePage('skills')}>Skills & Prompting</button>
          <button className={videoModalOpen ? 'active' : ''} onClick={() => setVideoModalOpen(true)}>Vídeos Explicativos</button>
        </div>

        <div className="nav-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="btn-primary" onClick={startQuiz}>Comenzar evaluación</button>
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* ── HOME ── */}
        {page === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page active">
            <section className="hero">
              <div className="hero-glow" />
              <div>
                <div className="hero-badge"><span className="badge-dot" />Plataforma empresarial de IA · 2026</div>
                <h1 className="hero-title">Domina la<br /><span className="accent">Inteligencia</span><br /><span className="accent2">Artificial</span><br />Empresarial</h1>
                <p className="hero-sub">Formación estratégica sobre modelos IA, arquitecturas agénticas y optimización de prompts para la empresa moderna.</p>
              </div>
            </section>

            <div className="section">
              <div className="section-tag">Contenido exclusivo</div>
              <h2 className="section-title">Ecosistema de formación<br />en Inteligencia Artificial</h2>
              <div className="features-grid">
                <div className="feat-card" onClick={() => handlePage('models')}>
                  <div className="feat-icon purple">🧠</div>
                  <div className="feat-title">Biblioteca de Modelos IA</div>
                  <div className="feat-desc">Compara GPT-4o, Claude, Gemini, Llama, Mistral y más. Capacidades, casos de uso y cuándo usar cada uno.</div>
                </div>
                <div className="feat-card" onClick={() => handlePage('agentic')}>
                  <div className="feat-icon teal">⚡</div>
                  <div className="feat-title">Sistemas Agénticos</div>
                  <div className="feat-desc">Entiende RAG, CoT, ReAct, AutoGPT, multi-agente y los frameworks más usados en producción.</div>
                </div>
                <div className="feat-card" onClick={() => handlePage('skills')}>
                  <div className="feat-icon amber">🎯</div>
                  <div className="feat-title">Skills & Prompt Engineering</div>
                  <div className="feat-desc">Por qué las skills transforman los modelos, cómo definirlas, y técnicas de prompting con ejemplos reales.</div>
                </div>
                <div className="feat-card" onClick={() => setVideoModalOpen(true)}>
                  <div className="feat-icon red">🎬</div>
                  <div className="feat-title">Vídeos Explicativos</div>
                  <div className="feat-desc">Tutoriales en formato podcast generados con NotebookLM para formación corporativa interna.</div>
                </div>
                <div className="feat-card" onClick={() => handlePage('models')}>
                  <div className="feat-icon purple">📊</div>
                  <div className="feat-title">Benchmarks & Comparativas</div>
                  <div className="feat-desc">Modelos actualizados en tiempo real desde HuggingFace Hub. Toma decisiones con datos reales.</div>
                </div>
                <div className="feat-card" onClick={() => handlePage('agentic')}>
                  <div className="feat-icon teal">🏗️</div>
                  <div className="feat-title">Arquitecturas Empresariales</div>
                  <div className="feat-desc">Patrones de integración, RAG empresarial, seguridad y gobernanza de IA en producción.</div>
                </div>
              </div>
            </div>

            <footer>
              <div className="footer-logo">AI<span>GEN</span></div>
              <div className="footer-text">Plataforma de formación empresarial en Inteligencia Artificial · 2026</div>
            </footer>
          </motion.div>
        )}

        {/* ── MODELS ── */}
        {page === 'models' && (
          <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page active">
            <div className="models-header">
              <h2 className="models-title">Ecosistema de Soluciones IA</h2>
              <p style={{ color: 'var(--c-muted)', fontSize: '.9rem', maxWidth: '800px' }}>
                Selecciona la tecnología que mejor se adapte a los objetivos estratégicos de tu organización.
              </p>
            </div>

            <div className="model-filter-row" style={{ justifyContent: 'space-between', padding: '1.25rem 3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '.85rem', fontWeight: '600', color: 'var(--c-muted)' }}>Categoría:</span>
                <select
                  className="filter-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="Todos">Todos los modelos</option>
                  <option value="LLM">Razonamiento y Texto (LLM)</option>
                  <option value="MM">Multimodal (Texto/Imagen/Audio)</option>
                  <option value="Vision">Generación Visual y Diseño</option>
                  <option value="Video">Vídeo y Avatares Digitales</option>
                  <option value="Audio">Voz y Audio Corporativo</option>
                  <option value="Search">Investigación y Buscadores</option>
                  <option value="Translator">Traducción Profesional</option>
                  <option value="Agent">Arquitecturas Agénticas</option>
                  <option value="Legal">Especializado Legal/Compliance</option>
                </select>
              </div>

              {filter !== 'Todos' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--c-accent1)', fontSize: '.8rem', fontWeight: '600' }}>
                  {isLoadingHF
                    ? <><Loader2 size={14} className="animate-spin" /> Consultando HuggingFace Hub...</>
                    : <><span className="badge-dot" style={{ background: 'var(--c-accent1)' }} /> Datos en tiempo real · HuggingFace Hub</>
                  }
                </div>
              )}
            </div>

            {/* FIX: Banner de error HF visible para el usuario */}
            {hfError && (
              <div style={{
                margin: '0 3rem',
                padding: '.85rem 1.25rem',
                background: 'rgba(255,198,90,0.08)',
                border: '1px solid rgba(255,198,90,0.3)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '.75rem',
                fontSize: '.82rem',
                color: 'var(--c-amber)'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {hfError}
              </div>
            )}

            <div className="models-grid" style={{ marginTop: '1px' }}>
              {filteredModels.map(m => (
                <div key={m.id} className="model-card">
                  <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                    <div className="model-logo" style={{ background: m.color }}>{m.logo}</div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{m.name}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--c-muted)' }}>{m.company}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '.9rem', color: 'var(--c-text)', lineHeight: '1.5', margin: '1rem 0' }}>{m.generalDesc}</p>
                  <div className="model-tags">
                    {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <div
                    onClick={() => setHelpModel(m)}
                    style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--c-border)', fontSize: '.85rem', color: 'var(--c-accent1)', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>En qué ayuda a mi empresa →</span>
                    <span style={{ fontSize: '.7rem', color: 'var(--c-muted)', fontWeight: '400' }}>Enterprise Ready</span>
                  </div>
                </div>
              ))}

              {/* DYNAMIC HF MODELS */}
              {isLoadingHF ? (
                <div className="model-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', borderStyle: 'dashed', minHeight: '200px' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--c-accent1)" />
                  <p style={{ fontSize: '.85rem', color: 'var(--c-muted)', textAlign: 'center' }}>
                    Cargando modelos en tiempo real<br />desde HuggingFace Hub...
                  </p>
                </div>
              ) : (
                dynamicModels.map(m => (
                  <div key={m.id} className="model-card" style={{ borderColor: 'var(--c-accent1)', background: 'rgba(0,229,192,0.02)' }}>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                      <div className="model-logo" style={{ background: m.color, color: 'var(--c-accent1)', border: '1px solid var(--c-accent1)' }}>{m.logo}</div>
                      <div>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {m.name}
                          <ExternalLink size={12} style={{ opacity: 0.5 }} />
                        </div>
                        <div style={{ fontSize: '.8rem', color: 'var(--c-muted)' }}>{m.company}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '.9rem', color: 'var(--c-text)', lineHeight: '1.5', margin: '1rem 0' }}>{m.generalDesc}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '.75rem', fontWeight: '600', color: 'var(--c-muted)' }}>
                      <span>⬇ {m.downloads.toLocaleString()}</span>
                      <span>♥ {m.likes.toLocaleString()}</span>
                    </div>
                    <div className="model-tags">
                      {m.tags.map(t => <span key={t} className="tag" style={{ borderColor: 'var(--c-accent1)', color: 'var(--c-accent1)' }}>{t}</span>)}
                      <span className="tag" style={{ background: 'var(--c-accent1)', color: '#fff', border: 'none' }}>LIVE HF</span>
                    </div>
                    <div
                      onClick={() => setHelpModel(m)}
                      style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--c-border)', fontSize: '.85rem', color: 'var(--c-accent1)', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>En qué ayuda a mi empresa →</span>
                      <span style={{ fontSize: '.7rem', color: 'var(--c-accent1)', fontWeight: '700' }}>Última tendencia</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ── AGENTIC ── */}
        {page === 'agentic' && (
          <motion.div key="agentic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page active">
            <div className="models-header">
              <h2 className="models-title">Sistemas Agénticos</h2>
              <p style={{ color: 'var(--c-muted)', fontSize: '.9rem' }}>Arquitecturas autónomas que permiten a la IA razonar, planificar y actuar.</p>
            </div>
            <div className="agentic-systems">
              <div className="system-sidebar">
                {AGENTIC.map(a => (
                  <div key={a.id} className={`system-item ${activeAgent.id === a.id ? 'active' : ''}`} onClick={() => setActiveAgent(a)}>
                    <div style={{ fontSize: '1.5rem' }}>{a.icon}</div>
                    <div>
                      <div style={{ fontSize: '.9rem', fontWeight: '600' }}>{a.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--c-muted)' }}>{a.full}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="system-detail">
                <h2 className="section-title" style={{ fontSize: '2rem' }}>{activeAgent.name} - {activeAgent.full}</h2>
                <p style={{ color: 'var(--c-muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>{activeAgent.desc}</p>
                <h3 className="section-tag" style={{ marginTop: '2rem' }}>Flujo de ejecución</h3>
                <div className="flow-diagram" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                  {activeAgent.flow.map((f, i) => (
                    <React.Fragment key={f}>
                      <div className={`flow-node ${i === 0 ? 'active-node' : ''}`} style={{ borderWidth: '2px' }}>{f}</div>
                      {i < activeAgent.flow.length - 1 && <div style={{ color: 'var(--c-muted)', fontSize: '1.5rem' }}>→</div>}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ marginTop: '4rem' }}>
                  <h3 className="section-tag">Aplicaciones reales en la empresa</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', marginTop: '1rem' }}>
                    {activeAgent.uses.map(u => (
                      <div key={u} style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', padding: '1.5rem', borderRadius: 'var(--radius)', fontSize: '.95rem', color: 'var(--c-text)', fontWeight: '500' }}>
                        <div style={{ color: 'var(--c-accent1)', marginBottom: '0.5rem' }}>✓</div>
                        {u}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SKILLS ── */}
        {page === 'skills' && (
          <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page active">
            <div className="models-header">
              <h2 className="models-title">Skills & Prompt Engineering</h2>
              <p style={{ color: 'var(--c-muted)', fontSize: '.9rem' }}>Aprende a potenciar cualquier modelo de IA con skills bien definidas y técnicas de prompting que transforman los resultados.</p>
            </div>
            <div style={{ padding: '0 3rem 3rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius)', padding: '3rem', marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem', alignItems: 'center' }}>
                <div>
                  <h3 className="section-title" style={{ fontSize: '1.8rem' }}>¿Qué son las skills en un modelo de IA?</h3>
                  <p style={{ color: 'var(--c-muted)', fontSize: '.95rem', lineHeight: '1.7', marginTop: '1rem' }}>Una <strong style={{ color: 'var(--c-text)' }}>skill</strong> es un conjunto de instrucciones, contexto y ejemplos que define cómo un modelo debe comportarse en una tarea específica. Al añadir skills, conviertes un modelo genérico en un experto especializado para tu empresa.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { dot: '#6c63ff', label: 'Modelo Base', sub: 'GPT-4o / Claude / Gemini' },
                    { dot: '#00e5c0', label: 'System Prompt', sub: 'Instrucciones base y personalidad' },
                    { dot: '#ffc65a', label: 'Skills', sub: 'Módulos de conocimiento específico' },
                    { dot: '#ff6b6b', label: 'Modelo Especializado', sub: 'Experto en tu dominio', border: '#6c63ff' },
                  ].map((item, i) => (
                    <React.Fragment key={item.label}>
                      {i > 0 && <div style={{ textAlign: 'center', color: 'var(--c-muted)', fontSize: '1rem' }}>↓</div>}
                      <div style={{ background: 'var(--c-surface2)', border: `1px solid ${item.border || 'var(--c-border2)'}`, borderRadius: 'var(--radius-sm)', padding: '0.75rem 1.25rem', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                        <span><strong>{item.label}</strong> — {item.sub}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem' }}>
                {SKILLS_LIST.map((s, i) => (
                  <div key={i} className="feat-card" style={{ cursor: 'default' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{s.icon}</div>
                    <h3 className="feat-title">{s.title}</h3>
                    <p className="feat-desc" style={{ marginBottom: '1.5rem' }}>{s.desc}</p>
                    <div style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--c-accent2)', whiteSpace: 'pre-wrap' }}>
                      {s.example}
                    </div>
                  </div>
                ))}
              </div>

              <div className="skills-comparison" style={{ marginTop: '4rem' }}>
                <div className="comp-column">
                  <div className="comp-label label-bad">Sin Skills (Prompt genérico)</div>
                  <div className="comp-prompt">"Analiza este contrato de ventas y dime qué dice."</div>
                  <div className="comp-result">
                    <strong style={{ color: 'var(--c-text)', display: 'block', marginBottom: '.5rem' }}>Resultado IA:</strong>
                    "El contrato habla de ventas, tiene fechas y firmas. Parece un contrato estándar entre dos empresas."<br /><br />
                    <div style={{ background: 'rgba(255,107,107,0.1)', padding: '.75rem', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.2)', fontSize: '.8rem', color: 'var(--c-accent3)' }}>
                      FALLO: No detecta penalizaciones, omite plazos financieros y no estructura la información.
                    </div>
                  </div>
                </div>
                <div className="comp-column" style={{ borderLeft: '1px solid var(--c-border)' }}>
                  <div className="comp-label label-good">Con Skills (Prompt Experto)</div>
                  <div className="comp-prompt">"Actúa como auditor legal Senior. Usa la SKILL:LEGAL_AUDIT para extraer: 1. Entidades, 2. Plazos pago, 3. Cláusulas riesgo."</div>
                  <div className="comp-result">
                    <strong style={{ color: 'var(--c-text)', display: 'block', marginBottom: '.5rem' }}>Resultado IA:</strong>
                    "1. Partes: Tech SA vs Global Inc.<br/>2. Plazo: 30 días netos.<br/>3. Riesgo: Cláusula 4.1 con 5% penalización diaria..."<br /><br />
                    <div style={{ background: 'rgba(0,229,192,0.1)', padding: '.75rem', borderRadius: '8px', border: '1px solid rgba(0,229,192,0.2)', fontSize: '.8rem', color: 'var(--c-accent2)' }}>
                      VALOR: Visión ejecutiva de riesgos, datos listos para CRM y precisión del 98%.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VIDEO MODAL: fondo con grid de vídeos + modal "Próximamente" encima ── */}
      {videoModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setVideoModalOpen(false)}
          style={{ alignItems: 'flex-start', overflowY: 'auto', paddingTop: 'var(--nav-h)' }}
        >
          {/* FONDO: página de vídeos visible detrás del modal */}
          <div
            style={{ position: 'fixed', inset: 0, paddingTop: 'var(--nav-h)', overflowY: 'auto', pointerEvents: 'none', filter: 'blur(2px)', opacity: 0.35 }}
            aria-hidden="true"
          >
            <div style={{ padding: '2rem 3rem' }}>
              <h2 className="models-title" style={{ marginBottom: '0.5rem' }}>Vídeos Explicativos</h2>
              <p style={{ color: 'var(--c-muted)', fontSize: '.9rem', marginBottom: '2rem' }}>Próximos tutoriales corporativos generados con NotebookLM</p>
              <div className="video-grid">
                {VIDEOS.map((v, i) => (
                  <div key={i} className="video-card">
                    <div className="video-thumb">
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', opacity: 0.3 }}>{v.emoji}</div>
                      <div className="play-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </div>
                    <div style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: '.72rem', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--c-accent2)', marginBottom: '.35rem' }}>{v.cat} · {v.dur}</div>
                      <div style={{ fontWeight: '600', fontSize: '.92rem', marginBottom: '.3rem' }}>{v.title}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MODAL "PRÓXIMAMENTE" encima */}
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ textAlign: 'center', padding: '3.5rem 2.5rem', margin: '4rem auto', position: 'relative', zIndex: 10 }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🎬</div>
            <h2 className="models-title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Vídeos Explicativos</h2>
            <p style={{ color: 'var(--c-accent1)', fontSize: '1.4rem', fontWeight: '700', margin: '0.75rem 0' }}>Próximamente</p>
            <p style={{ color: 'var(--c-muted)', fontSize: '.95rem', maxWidth: '440px', margin: '1rem auto 0.5rem', lineHeight: '1.65' }}>
              Estamos preparando <strong style={{ color: 'var(--c-text)' }}>6 tutoriales corporativos</strong> en formato podcast y vídeo generados con NotebookLM de Google.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', margin: '1.75rem auto', maxWidth: '360px', textAlign: 'left' }}>
              {VIDEOS.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', fontSize: '.85rem', color: 'var(--c-muted)', background: 'var(--c-surface2)', padding: '.6rem .9rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '1.1rem' }}>{v.emoji}</span>
                  <span><strong style={{ color: 'var(--c-text)' }}>{v.title}</strong> · {v.cat} · {v.dur}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setVideoModalOpen(false)}>
              Entendido, volver a la plataforma
            </button>
            <button
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              onClick={() => setVideoModalOpen(false)}
            >×</button>
          </div>
        </div>
      )}

      {/* ── HELP MODAL ── */}
      {helpModel && (
        <div className="modal-overlay" onClick={() => setHelpModel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="comp-label label-good">Impacto Empresarial</div>
            <h2 className="models-title" style={{ fontSize: '1.8rem' }}>{helpModel.name}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {helpModel.tags.map((t: string) => <span key={t} className="tag">{t}</span>)}
            </div>
            <p style={{ color: 'var(--c-text)', fontSize: '1.05rem', lineHeight: '1.7', background: 'var(--c-surface2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
              {helpModel.businessHelp}
            </p>
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setHelpModel(null)}>Cerrar</button>
            </div>
            <button style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setHelpModel(null)}>×</button>
          </div>
        </div>
      )}

      {/* ── QUIZ MODAL ── */}
      {quizOpen && randomizedQuestions.length > 0 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '680px' }}>
            {!quizDone ? (
              <>
                {/* Barra de progreso */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                    <span className="comp-label" style={{ margin: 0 }}>Evaluación técnica · Pregunta {quizStep + 1} de {randomizedQuestions.length}</span>
                    <span style={{ fontSize: '.78rem', color: 'var(--c-muted)', fontWeight: '600' }}>{score} correctas</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--c-border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((quizStep) / randomizedQuestions.length) * 100}%`, background: 'var(--c-accent1)', borderRadius: '999px', transition: 'width .4s ease' }} />
                  </div>
                </div>

                <div className="models-title" style={{ fontSize: '1.2rem', marginBottom: '1.75rem', lineHeight: '1.4' }}>
                  {randomizedQuestions[quizStep].q}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {randomizedQuestions[quizStep].options.map((opt, i) => {
                    const isCorrect = i === randomizedQuestions[quizStep].correct;
                    const isSelected = selectedAnswer === i;
                    return (
                      <button
                        key={opt}
                        className="quiz-option"
                        disabled={selectedAnswer !== null}
                        style={{
                          borderColor: selectedAnswer !== null
                            ? (isCorrect ? 'var(--c-accent2)' : (isSelected ? 'var(--c-accent3)' : 'var(--c-border)'))
                            : undefined,
                          background: selectedAnswer !== null
                            ? (isCorrect ? 'rgba(0,229,192,0.1)' : (isSelected ? 'rgba(255,107,107,0.1)' : undefined))
                            : undefined,
                          borderWidth: isCorrect && selectedAnswer !== null ? '2px' : '1px'
                        }}
                        onClick={() => handleAnswer(i)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ textAlign: 'left' }}>{opt}</span>
                          {selectedAnswer !== null && (
                            <span style={{ flexShrink: 0 }}>
                              {isCorrect ? <span style={{ color: 'var(--c-accent2)', fontWeight: '700' }}>✓</span> : (isSelected ? <span style={{ color: 'var(--c-accent3)', fontWeight: '700' }}>✗</span> : '')}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* FIX: Mostrar explicación tras responder */}
                {selectedAnswer !== null && (randomizedQuestions[quizStep] as any).explanation && (
                  <div style={{ marginTop: '1rem', padding: '.85rem 1rem', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', fontSize: '.82rem', color: 'var(--c-muted)', lineHeight: '1.6' }}>
                    💡 <strong style={{ color: 'var(--c-text)' }}>Explicación:</strong> {(randomizedQuestions[quizStep] as any).explanation}
                  </div>
                )}

                {selectedAnswer !== null && (
                  <button className="btn-primary" style={{ marginTop: '1.25rem', width: '100%', padding: '1rem' }} onClick={nextQuestion}>
                    {quizStep < randomizedQuestions.length - 1 ? 'Siguiente pregunta →' : 'Ver resultados →'}
                  </button>
                )}
              </>
            ) : (
              // FIX: Resultado por porcentaje, no valor absoluto
              <div style={{ textAlign: 'center' }}>
                <div className="models-title">Evaluación Finalizada</div>
                <p style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--c-accent1)', margin: '1.25rem 0 0.5rem', fontFamily: 'var(--font-display)' }}>
                  {score} <span style={{ fontSize: '1.5rem', color: 'var(--c-muted)' }}>/ {randomizedQuestions.length}</span>
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--c-accent1)', marginBottom: '.75rem' }}>
                  {Math.round((score / randomizedQuestions.length) * 100)}%
                </p>
                <p style={{ color: getQuizResult(score, randomizedQuestions.length).color, fontWeight: '600', lineHeight: '1.5', maxWidth: '400px', margin: '0 auto 2rem' }}>
                  {getQuizResult(score, randomizedQuestions.length).msg}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { val: score, label: 'Correctas', color: 'var(--c-accent2)' },
                    { val: randomizedQuestions.length - score, label: 'Incorrectas', color: 'var(--c-accent3)' },
                    { val: `${Math.round((score / randomizedQuestions.length) * 100)}%`, label: 'Puntuación', color: 'var(--c-accent1)' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--c-surface2)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: item.color }}>{item.val}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--c-muted)', marginTop: '.2rem' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={startQuiz}>Repetir evaluación</button>
                  <button className="btn-outline-lg" style={{ flex: 1, padding: '1rem', fontSize: '.9rem' }} onClick={closeQuiz}>Cerrar</button>
                </div>
              </div>
            )}
            <button style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontSize: '1.5rem' }} onClick={closeQuiz}>×</button>
          </div>
        </div>
      )}
    </>
  );
}
