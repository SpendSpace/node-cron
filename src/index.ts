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
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Budget alert error:`, error);
  }
}

// Run daily at 9:00 am UTC (3:00 am CDT)
cron.schedule("00 09 * * *", runBudgetAlerts);

/**
 * SimpleFIN Daily Sync
 * Syncs transactions for all SimpleFIN connections (international users)
 */
async function runSimpleFINSync() {
  console.log(`[${new Date().toISOString()}] Running SimpleFIN daily sync...`);

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
      }
    );

    const data = await response.json();
    console.log(
      `[${new Date().toISOString()}] SimpleFIN sync result:`,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] SimpleFIN sync error:`, error);
  }
}

// SimpleFIN daily sync - runs at 6:00 AM UTC (midnight CST)
cron.schedule("00 06 * * *", runSimpleFINSync);

console.log(
  `[${new Date().toISOString()}] Cron service started. Budget alerts: 9:00 UTC, SimpleFIN sync: 6:00 UTC daily.`
);
