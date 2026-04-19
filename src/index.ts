import cron from "node-cron";

const API_URL = process.env.API_URL || "https://api.spendspace.io";
const SECURITY_SERVICE_URL =
  process.env.SECURITY_SERVICE_URL ||
  "https://spendspace-security.up.railway.app";
const CRON_SECRET = process.env.CRON_SECRET;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const BLOG_ADMIN_EMAIL = process.env.BLOG_ADMIN_EMAIL || "jlew24asu@gmail.com";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function runBudgetAlerts() {
  console.log(`[${new Date().toISOString()}] Running budget alert check...`);

  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/budget-alerts/cron/run`, {
      method: "POST",
      headers: {
        "x-cron-secret": CRON_SECRET,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(
      `[${new Date().toISOString()}] Budget alert result:`,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Budget alert error:`, error);
  }
}

// Run daily at 9:00 am UTC (3:00 am CDT)
cron.schedule("00 09 * * *", runBudgetAlerts);

/**
 * SimpleFIN Hourly Sync
 * Syncs transactions for all SimpleFIN connections and sends alerts for failures
 */
async function runSimpleFINSync() {
  console.log(`[${new Date().toISOString()}] Running SimpleFIN sync...`);

  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return;
  }

  try {
    const response = await fetch(
      `${SECURITY_SERVICE_URL}/api/simplefin/cron/sync`,
      {
        method: "POST",
        headers: {
          "x-cron-secret": CRON_SECRET,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as {
      success: boolean;
      data?: { failures?: Array<unknown> };
    };
    console.log(
      `[${new Date().toISOString()}] SimpleFIN sync result:`,
      JSON.stringify(data),
    );

    // Send connection alerts for any failures
    if (data.success && data.data?.failures && data.data.failures.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Sending connection alerts for ${data.data.failures.length} failure(s)...`,
      );

      try {
        const alertResponse = await fetch(`${API_URL}/connection-alerts/send`, {
          method: "POST",
          headers: {
            "x-cron-secret": CRON_SECRET!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ failures: data.data.failures }),
        });

        const alertData = await alertResponse.json();
        console.log(
          `[${new Date().toISOString()}] Connection alert result:`,
          JSON.stringify(alertData),
        );
      } catch (alertError) {
        console.error(
          `[${new Date().toISOString()}] Connection alert error:`,
          alertError,
        );
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] SimpleFIN sync error:`, error);
  }
}

// SimpleFIN sync - runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
cron.schedule("00 */6 * * *", runSimpleFINSync);

/**
 * Lunch Flow Hourly Sync
 * Syncs transactions for all Lunch Flow connections and sends alerts for failures
 */
async function runLunchFlowSync() {
  console.log(`[${new Date().toISOString()}] Running Lunch Flow sync...`);

  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return;
  }

  try {
    const response = await fetch(
      `${SECURITY_SERVICE_URL}/api/lunchflow/cron/sync`,
      {
        method: "POST",
        headers: {
          "x-cron-secret": CRON_SECRET,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as {
      success: boolean;
      data?: { failures?: Array<unknown> };
    };
    console.log(
      `[${new Date().toISOString()}] Lunch Flow sync result:`,
      JSON.stringify(data),
    );

    // Send connection alerts for any failures
    if (data.success && data.data?.failures && data.data.failures.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Sending connection alerts for ${data.data.failures.length} Lunch Flow failure(s)...`,
      );

      try {
        const alertResponse = await fetch(`${API_URL}/connection-alerts/send`, {
          method: "POST",
          headers: {
            "x-cron-secret": CRON_SECRET!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ failures: data.data.failures }),
        });

        const alertData = await alertResponse.json();
        console.log(
          `[${new Date().toISOString()}] Connection alert result:`,
          JSON.stringify(alertData),
        );
      } catch (alertError) {
        console.error(
          `[${new Date().toISOString()}] Connection alert error:`,
          alertError,
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Lunch Flow sync error:`,
      error,
    );
  }
}

// Lunch Flow sync - runs every 6 hours at :30 (00:30, 06:30, 12:30, 18:30 UTC)
cron.schedule("30 */6 * * *", runLunchFlowSync);

/**
 * Weekly Budget Summary Emails
 * Sends weekly budget summary emails to users who have opted in
 */
async function runWeeklyBudgetSummary() {
  console.log(
    `[${new Date().toISOString()}] Running weekly budget summary emails...`,
  );

  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/zero-budget/weekly-summary/cron`, {
      method: "POST",
      headers: {
        "x-cron-secret": CRON_SECRET,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(
      `[${new Date().toISOString()}] Weekly budget summary result:`,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Weekly budget summary error:`,
      error,
    );
  }
}

// Weekly budget summary - runs every Sunday at 14:00 UTC (8:00 AM CST)
cron.schedule("00 14 * * 0", runWeeklyBudgetSummary);

/**
 * Blog Content Generation
 * Auto-generates blog post drafts on Monday and Thursday
 */

// SEO-focused topics for blog generation
const SEO_TOPICS = [
  {
    title: "Best Personal Finance App in 2026: A Complete Guide",
    keywords: ["best personal finance app", "budget app", "expense tracker"],
    category: "personal-finance",
  },
  {
    title: "Mint Shut Down? Here Are the Best Alternatives",
    keywords: ["mint alternative", "mint shutdown", "budget app alternative"],
    category: "personal-finance",
  },
  {
    title: "SpendSpace vs YNAB: Which Budget App is Right for You?",
    keywords: [
      "ynab alternative",
      "spendspace vs ynab",
      "budget app comparison",
    ],
    category: "spendspace",
  },
  {
    title: "How to Track Expenses Without Spreadsheets",
    keywords: [
      "track expenses",
      "expense tracking app",
      "no spreadsheet budgeting",
    ],
    category: "budgeting",
  },
  {
    title: "The Best Budget App for Beginners in 2026",
    keywords: [
      "best budget app for beginners",
      "easy budget app",
      "simple budgeting",
    ],
    category: "budgeting",
  },
  {
    title: "Why Custom Budget Categories Change Everything",
    keywords: [
      "custom budget categories",
      "personalized budgeting",
      "flexible budget app",
    ],
    category: "spendspace",
  },
  {
    title: "5 Signs Your Budget App Isn't Working (And What to Do)",
    keywords: ["budget app not working", "budgeting tips", "change budget app"],
    category: "tips",
  },
  {
    title: "How to Connect Your Bank Account to a Budget App Safely",
    keywords: [
      "connect bank to budget app",
      "bank connection security",
      "plaid alternative",
    ],
    category: "personal-finance",
  },
  {
    title: "The 50/30/20 Rule: Does It Actually Work?",
    keywords: ["50 30 20 rule", "budgeting rules", "budget percentages"],
    category: "budgeting",
  },
  {
    title: "Auto-Categorization: How AI Makes Budgeting Effortless",
    keywords: [
      "auto categorize transactions",
      "ai budgeting",
      "automatic expense tracking",
    ],
    category: "spendspace",
  },
  {
    title: "How to Budget for Irregular Income",
    keywords: [
      "irregular income budget",
      "freelancer budgeting",
      "variable income",
    ],
    category: "budgeting",
  },
  {
    title: "The Psychology of Spending: Why We Overspend",
    keywords: [
      "psychology of spending",
      "overspending habits",
      "mindful spending",
    ],
    category: "personal-finance",
  },
  {
    title: "Building an Emergency Fund: A Step-by-Step Guide",
    keywords: ["emergency fund", "savings guide", "financial safety net"],
    category: "personal-finance",
  },
  {
    title: "How to Pay Off Debt While Still Saving Money",
    keywords: [
      "pay off debt",
      "debt payoff strategy",
      "save while paying debt",
    ],
    category: "budgeting",
  },
  {
    title: "Subscription Audit: Finding Hidden Monthly Charges",
    keywords: ["subscription audit", "cancel subscriptions", "hidden charges"],
    category: "tips",
  },
];

async function callGemini(prompt: string): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);
}

function estimateReadTime(content: string): string {
  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min read`;
}

async function generateBlogPost(): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
} | null> {
  // Pick a random topic
  const topic = SEO_TOPICS[Math.floor(Math.random() * SEO_TOPICS.length)];
  console.log(
    `[${new Date().toISOString()}] Generating blog post: "${topic.title}"`,
  );

  const prompt = `You are a professional content writer for SpendSpace, a personal finance app that helps users track expenses with custom categories and auto-categorization.

Write a comprehensive, SEO-optimized blog post about: "${topic.title}"

Target keywords to naturally include: ${topic.keywords.join(", ")}

Requirements:
1. Write in a friendly, conversational but professional tone
2. Include practical, actionable advice
3. Naturally mention SpendSpace features where relevant (custom categories, auto-categorization, bank connections, CSV import)
4. Structure with clear H2 and H3 headings
5. Include bullet points and lists for readability
6. Aim for 1200-1500 words
7. End with a clear call-to-action mentioning SpendSpace's free trial

Format your response as valid JSON with this exact structure:
{
  "title": "The exact title for the post",
  "excerpt": "A compelling 150-160 character summary for SEO",
  "content": "<h2>First Section</h2><p>Content here...</p>..."
}

Important:
- The content field must be valid HTML (h2, h3, p, ul, li, ol, strong, em, a, blockquote tags only)
- Escape any quotes inside the JSON strings
- Do not include any markdown, only HTML in the content field
- Make sure the JSON is valid and parseable`;

  try {
    const response = await callGemini(prompt);

    // Extract JSON from response
    let jsonStr = response;
    if (response.includes("```json")) {
      jsonStr = response.split("```json")[1].split("```")[0].trim();
    } else if (response.includes("```")) {
      jsonStr = response.split("```")[1].split("```")[0].trim();
    }

    const generated = JSON.parse(jsonStr) as {
      title: string;
      excerpt: string;
      content: string;
    };
    const slug = slugify(generated.title);
    const today = new Date().toISOString().split("T")[0];

    return {
      title: generated.title,
      slug,
      excerpt: generated.excerpt,
      content: generated.content,
      category: topic.category,
      tags: topic.keywords,
      date: today,
      readTime: estimateReadTime(generated.content),
    };
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Blog generation error:`,
      error,
    );
    return null;
  }
}

async function sendBlogNotificationEmail(post: {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
}) {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured for email");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/email/send`, {
      method: "POST",
      headers: {
        "x-cron-secret": CRON_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: BLOG_ADMIN_EMAIL,
        subject: `📝 New Blog Draft Ready: ${post.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Blog Post Draft Generated</h1>
            <p>A new blog post draft has been automatically generated and is ready for your review.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1f2937;">${post.title}</h2>
              <p style="color: #6b7280;">${post.excerpt}</p>
              <p style="color: #9ca3af; font-size: 14px;">Generated: ${post.date}</p>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Review the draft in <code>drafts/${post.slug}.json</code></li>
              <li>Edit content and update image URL if needed</li>
              <li>Run: <code>node scripts/publish-blog-post.js ${post.slug}</code></li>
              <li>Deploy changes to publish</li>
            </ol>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message from SpendSpace Blog System.
            </p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      console.log(
        `[${new Date().toISOString()}] Blog notification email sent to ${BLOG_ADMIN_EMAIL}`,
      );
    } else {
      console.error(
        `[${new Date().toISOString()}] Failed to send blog notification email:`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Email error:`, error);
  }
}

async function runBlogGeneration() {
  console.log(
    `[${new Date().toISOString()}] Running blog content generation...`,
  );

  if (!GOOGLE_AI_API_KEY) {
    console.error(
      "GOOGLE_AI_API_KEY not configured - skipping blog generation",
    );
    return;
  }

  try {
    const post = await generateBlogPost();

    if (post) {
      console.log(
        `[${new Date().toISOString()}] Blog post generated: "${post.title}"`,
      );

      // Store the draft via API (we'll create this endpoint)
      try {
        const storeResponse = await fetch(`${API_URL}/blog/drafts`, {
          method: "POST",
          headers: {
            "x-cron-secret": CRON_SECRET || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            date: post.date,
            author: "SpendSpace Team",
            category: post.category,
            readTime: post.readTime,
            image:
              "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
            tags: post.tags,
            published: false,
            content: post.content,
          }),
        });

        if (storeResponse.ok) {
          console.log(
            `[${new Date().toISOString()}] Draft stored successfully`,
          );
        } else {
          // If API storage fails, just log the draft details
          console.log(
            `[${new Date().toISOString()}] Draft storage API not available - draft details logged`,
          );
          console.log(`Draft slug: ${post.slug}`);
        }
      } catch {
        console.log(
          `[${new Date().toISOString()}] Draft storage API not available`,
        );
      }

      // Send notification email
      await sendBlogNotificationEmail(post);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Blog generation error:`,
      error,
    );
  }
}

// Blog generation - runs Monday and Thursday at 10:00 UTC (4:00 AM CST)
cron.schedule("00 10 * * 1,4", runBlogGeneration);

console.log(
  `[${new Date().toISOString()}] Cron service started. Budget alerts: 9:00 UTC daily, SimpleFIN sync: every 6h (:00), Lunch Flow sync: every 6h (:30), Weekly summary: 14:00 UTC Sundays, Blog generation: 10:00 UTC Mon/Thu.`,
);
