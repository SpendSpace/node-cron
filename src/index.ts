import cron from 'node-cron';

const API_URL = process.env.API_URL || 'https://api.spendspace.io';
const CRON_SECRET = process.env.CRON_SECRET;

async function runBudgetAlerts() {
  console.log(`[${new Date().toISOString()}] Running budget alert check...`);

  if (!CRON_SECRET) {
    console.error('CRON_SECRET not configured');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/budget-alerts/cron/run`, {
      method: 'POST',
      headers: {
        'x-cron-secret': CRON_SECRET,
        'Content-Type': 'application/json',
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

// Run daily at 9am UTC (3am CST / 4am CDT)
cron.schedule('0 9 * * *', runBudgetAlerts);

console.log(
  `[${new Date().toISOString()}] Cron service started. Budget alerts scheduled for 9am UTC daily.`
);
