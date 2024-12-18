import cron from "node-cron";

const task = cron.schedule(
  "*/10 * * * *",
  () => {
    console.log("Cron job running every 10 minutes");
    // to make render server alive
  },
  {
    scheduled: true,
    timezone: "America/New_York",
  }
);

task.start();
