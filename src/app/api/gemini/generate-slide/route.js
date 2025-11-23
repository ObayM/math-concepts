import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function POST(req) {
  try {
    const { history } = await req.json();

    const prompt = `
      User History: ${JSON.stringify(history)}
      
      Generate a JSON object for a new LessonSlide.
      
      IMPORTANT: The 'visualization' object defines the graph.
      - 'elements': Array of visual parts.
      - 'expression': A math string using 'x' (for functions) or 't' (for interactive parts). 
        Supported: +, -, *, /, ^, sin, cos, abs, sqrt.
        Example: "x^2 + 2", "sin(t)", "2*t".
      - 'paramRange': The range for the interactive slider variable 't'.
      
      Structure:
      {
        "id": "generated-1",
        "title": "Short Title",
        "content": "Explanation",
        "category": "Challenge",
        "interactiveType": "graph",
        "visualization": {
          "xDomain": [-10, 10],
          "yDomain": [-10, 10],
          "paramRange": [-5, 5],
          "paramLabel": "Input x",
          "elements": [
            { "id": "f1", "type": "function", "expression": "0.1 * x^3", "color": "#3b82f6", "strokeWidth": 4 },
            { "id": "p1", "type": "point", "x": "t", "y": "0.1 * t^3", "color": "#ef4444", "r": 6, "label": "P" }
          ]
        }
      }

      Generate 1 slide. Only return JSON
    `;


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    const slide = JSON.parse(text);

    return Response.json({ ...slide, isAiGenerated: true });
  } catch (error) {
    console.error("Slide generation error", error);
    return Response.json({ error: "Slide generation failed" }, { status: 500 });
  }
}
