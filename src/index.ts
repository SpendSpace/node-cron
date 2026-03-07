import cron from "node-cron";

const API_URL = process.env.API_URL || "https://api.spendspace.io";
const SECURITY_SERVICE_URL =
  process.env.SECURITY_SERVICE_URL ||
  "https://spendspace-security.up.railway.app";
const CRON_SECRET = process.env.CRON_SECRET;

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

// SimpleFIN hourly sync - runs at the top of every hour
cron.schedule("00 * * * *", runSimpleFINSync);

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
    const response = await fetch(
      `${API_URL}/api/zero-budget/weekly-summary/cron`,
      {
        method: "POST",
        headers: {
          "x-cron-secret": CRON_SECRET,
          "Content-Type": "application/json",
        },
      },
    );

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

console.log(
  `[${new Date().toISOString()}] Cron service started. Budget alerts: 9:00 UTC daily, SimpleFIN sync: hourly, Weekly summary: 14:00 UTC Sundays.`,
);
