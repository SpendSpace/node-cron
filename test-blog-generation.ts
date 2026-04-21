/**
 * Manual test script for blog generation
 * Run with: npx ts-node test-blog-generation.ts
 * 
 * Requires GOOGLE_AI_API_KEY environment variable
 */

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent";

const SEO_TOPICS = [
  {
    title: "Best Personal Finance App in 2026: A Complete Guide",
    keywords: ["best personal finance app", "budget app", "expense tracker"],
    category: "personal-finance",
  },
  {
    title: "How to Track Expenses Without Spreadsheets",
    keywords: ["track expenses", "expense tracking app", "no spreadsheet budgeting"],
    category: "budgeting",
  },
];

async function callGemini(prompt: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not configured. Set it with: $env:GOOGLE_AI_API_KEY='your-key'");
  }

  console.log("Calling Gemini API...");
  const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0].content.parts[0].text;
}

async function testBlogGeneration() {
  console.log("=== Blog Generation Test ===\n");
  
  // Pick first topic for testing
  const topic = SEO_TOPICS[0];
  console.log(`Testing with topic: "${topic.title}"`);
  console.log(`Keywords: ${topic.keywords.join(", ")}\n`);

  const prompt = `You are a professional content writer for SpendSpace, a personal finance app.

Write a SHORT test blog post (just 2-3 paragraphs) about: "${topic.title}"

Target keywords: ${topic.keywords.join(", ")}

Format your response as valid JSON:
{
  "title": "The title",
  "excerpt": "A 150 character summary",
  "content": "<h2>Test</h2><p>Content here...</p>"
}`;

  try {
    const response = await callGemini(prompt);
    console.log("✅ Gemini API call successful!\n");
    
    // Extract JSON
    let jsonStr = response;
    if (response.includes("```json")) {
      jsonStr = response.split("```json")[1].split("```")[0].trim();
    } else if (response.includes("```")) {
      jsonStr = response.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(jsonStr);
    console.log("✅ JSON parsing successful!\n");
    console.log("Generated post:");
    console.log(`  Title: ${parsed.title}`);
    console.log(`  Excerpt: ${parsed.excerpt}`);
    console.log(`  Content length: ${parsed.content.length} chars\n`);
    
    console.log("=== TEST PASSED ===");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

testBlogGeneration();
