
import { GoogleGenAI } from '@google/genai';

export async function POST(req) {
  try {
    const { sentence } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'GEMINI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt =
      'You convert a messy, real-world expense sentence into a bill split. ' +
      'Extract the total expense amount and count the total number of people sharing it. ' +
      'People-count rules: "split with 2 friends" means 3 people total (you plus 2 friends); ' +
      '"just me" means 1 person; "4 of us" means 4 people; "split 3 ways" means 3 people total; ' +
      'and names such as "me, Raj and Priya" mean 3 people total. Count only people who share the expense. ' +
      'If no amount is found anywhere in the sentence, set amount to 0 and people to 1; do not guess an amount or number of people. ' +
      'Calculate each as amount divided by people. Use the expense category or purchase as a short description. ' +
      'Return ONLY valid JSON with exactly these keys: amount, people, each, description. ' +
      'Do not use markdown, code fences, or any extra words.\n\n' +
      'Examples:\n' +
      'Sentence: "me, raj and priya had dinner for 1200"\n' +
      'Expected JSON: {"amount":1200,"people":3,"each":400,"description":"dinner"}\n' +
      'Sentence: "900 cab, split with 2 friends"\n' +
      'Expected JSON: {"amount":900,"people":3,"each":300,"description":"cab"}\n' +
      'Sentence: "coffee 300, just me"\n' +
      'Expected JSON: {"amount":300,"people":1,"each":300,"description":"coffee"}\n' +
      'Sentence: "1500 for groceries, 4 of us"\n' +
      'Expected JSON: {"amount":1500,"people":4,"each":375,"description":"groceries"}\n' +
      'Sentence: "paid 600 for the movie, split 3 ways"\n' +
      'Expected JSON: {"amount":600,"people":3,"each":200,"description":"movie"}\n\n' +
      'Sentence: "' + sentence + '"';

    // The free AI can be busy — try up to 3 times before giving up.
    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const text = (response.text || '')
      .trim()
      .replace(/^```json\s*|\s*```$/g, '');

    return Response.json(JSON.parse(text));

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
