import cron from "node-cron";
import { GroupCoin } from "../models/groupCoin";
import { GroupCoinHistory } from "../models/groupCoinHistory";
import indexService from "../service/indexService";


async function updateGroupCoinHistory(): Promise<void> {
  try {
    const allIndex = await GroupCoin.find({});
    for (const index of allIndex) {
      let totalPrice = 0;

      // Fetch all coin prices and calculate total
      for (const coin of index.coins) {
        const coinPrice = await indexService().getCoinCurrentPrice(coin.address)
        totalPrice += coinPrice;
      }

      // Create a new record in GroupCoinHistory
      await GroupCoinHistory.create({
        price: totalPrice / index.coins.length,
        time: Date.now(), // Current time in seconds
        indexId: index._id,
      });
    }

    console.log("GroupCoinHistory updated successfully.");
  } catch (error) {
    console.error("Error updating GroupCoinHistory:", error);
  }
}
// Run every 30 seconds
const cronSchedule = "*/30 * * * * *"; 
// const cronSchedule = "* * * * *"; // Run every 1 minute
// Create and start the cron job
const job = cron.schedule(cronSchedule, updateGroupCoinHistory);
job.start();
