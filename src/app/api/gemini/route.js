import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function POST(req) {
  try {
    const { context, question } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Context: ${context}\n\nUser Question: ${question}`,
      config: {
        systemInstruction:
          "You are a friendly, encouraging math tutor. Explain concepts simply. Keep responses under 80 words.",
      },
    });

    return Response.json({ answer: response.text });
  } catch (e) {
    console.error("Gemini API Error", e);
    return Response.json({ error: "Gemini failed" }, { status: 500 });
  }
}
