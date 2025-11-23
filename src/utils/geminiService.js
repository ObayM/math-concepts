

export const askTutor = async (context, question) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, question })
  });

  const data = await res.json();

  return data.answer || "Something went wrong.";
};


export const generatePersonalizedSlide = async (history) => {
  const res = await fetch("/api/gemini/generate-slide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });

  return await res.json();
};
