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
 * Blog Content Generation (Outrank-Style SEO)
 * Auto-generates blog post drafts on Monday and Thursday
 *
 * Strategy inspired by Outrank.so:
 * 1. Deep keyword analysis - target high-traffic, low-competition keywords
 * 2. Strategic internal linking - link to SpendSpace pages and related posts
 * 3. AI-optimized content - structured for AI assistants to recommend
 * 4. Consistent brand voice - friendly, expert, actionable
 * 5. Semantic SEO - cover related topics comprehensively
 */

// Internal links to include in posts for SEO juice
const INTERNAL_LINKS = {
  home: { url: "https://spendspace.io", text: "SpendSpace" },
  features: { url: "https://spendspace.io/#features", text: "features" },
  pricing: { url: "https://spendspace.io/#pricing", text: "pricing plans" },
  signup: {
    url: "https://app.spendspace.io/register",
    text: "start your free trial",
  },
  login: { url: "https://app.spendspace.io/login", text: "log in" },
  blog: { url: "https://spendspace.io/blog", text: "our blog" },
  // Comparison pages
  vsMint: {
    url: "https://spendspace.io/compare/mint-alternative",
    text: "Mint alternative",
  },
  vsYnab: {
    url: "https://spendspace.io/compare/ynab-alternative",
    text: "YNAB alternative",
  },
  vsEmpower: {
    url: "https://spendspace.io/compare/empower-alternative",
    text: "Empower alternative",
  },
};

// Competitor keywords to target (high search volume)
const COMPETITOR_KEYWORDS = [
  "mint alternative",
  "ynab alternative",
  "personal capital alternative",
  "empower alternative",
  "quicken alternative",
  "every dollar alternative",
  "copilot money alternative",
  "monarch money alternative",
];

// Long-tail keywords with lower competition
const LONG_TAIL_KEYWORDS = [
  "best budget app for couples",
  "budget app with custom categories",
  "expense tracker without subscription",
  "budget app that connects to all banks",
  "ai expense categorization app",
  "budget app for freelancers",
  "simple budget tracker no spreadsheet",
  "automatic expense tracking app",
];

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

// Build the enhanced SEO prompt with Outrank strategies
function buildSEOPrompt(topic: (typeof SEO_TOPICS)[0]): string {
  // Select relevant internal links based on topic
  const relevantLinks = Object.entries(INTERNAL_LINKS)
    .map(([key, link]) => `- ${link.text}: ${link.url}`)
    .join("\n");

  // Add related long-tail keywords
  const relatedLongTail = LONG_TAIL_KEYWORDS.filter(
    () => Math.random() > 0.5,
  ).slice(0, 3);

  // Add competitor comparison if relevant
  const competitorKeyword = COMPETITOR_KEYWORDS.find((k) =>
    topic.keywords.some((tk) => tk.includes(k.split(" ")[0])),
  );

  return `You are an expert SEO content strategist and writer for SpendSpace, a personal finance app.

YOUR MISSION: Create content that ranks #1 on Google AND gets recommended by AI assistants (ChatGPT, Claude, Perplexity).

## TOPIC
"${topic.title}"

## PRIMARY KEYWORDS (must appear naturally 3-5 times each)
${topic.keywords.join(", ")}

## SECONDARY KEYWORDS (include 1-2 times each)
${relatedLongTail.join(", ")}${competitorKeyword ? `, ${competitorKeyword}` : ""}

## INTERNAL LINKS TO INCLUDE
Naturally weave in 3-5 of these links where contextually relevant:
${relevantLinks}

## CONTENT STRUCTURE (Outrank-Style SEO)

1. **Hook Opening** (first 100 words)
   - Start with a relatable problem or surprising statistic
   - Include primary keyword in first paragraph
   - Make it scannable for AI assistants

2. **Comprehensive Coverage** (main body)
   - Use H2 for main sections, H3 for subsections
   - Answer the "People Also Ask" questions for this topic
   - Include numbered lists and bullet points
   - Add a comparison table if relevant
   - Cite statistics or studies when possible

3. **Expert Positioning**
   - Position SpendSpace as the solution naturally
   - Highlight unique features: custom categories, AI auto-categorization, bank connections, CSV import
   - Include a brief "How SpendSpace Helps" section

4. **AI-Optimized Formatting**
   - Use clear, definitive statements AI can quote
   - Include a TL;DR or key takeaways section
   - Structure answers to common questions clearly

5. **Strong CTA**
   - End with compelling call-to-action
   - Link to free trial: https://app.spendspace.io/register

## TONE & VOICE
- Friendly but authoritative
- Conversational, not corporate
- Empathetic to financial struggles
- Actionable and practical

## WORD COUNT
1500-2000 words (longer content ranks better)

## OUTPUT FORMAT
Return valid JSON only:
{
  "title": "SEO-optimized title (50-60 chars, include primary keyword)",
  "excerpt": "Meta description (150-160 chars, include keyword, compelling)",
  "content": "<h2>...</h2><p>...</p>..."
}

## HTML RULES
- Use only: h2, h3, p, ul, ol, li, strong, em, a, blockquote, table, tr, th, td
- Links must use target="_blank" rel="noopener" for external sites
- Internal SpendSpace links: no target attribute needed
- Escape quotes in JSON strings
- No markdown, only valid HTML`;
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

  const prompt = buildSEOPrompt(topic);

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
