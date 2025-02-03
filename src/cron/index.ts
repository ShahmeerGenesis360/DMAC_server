import cron from "node-cron";
import { IndexFund } from "../models/indexFund";
import { GroupCoin } from "../models/groupCoin";
import { GroupCoinHistory } from "../models/groupCoinHistory";
import indexService from "../service/indexService";

const SMOOTHING_FACTOR = 0.1;

async function updateGroupCoinHistory(): Promise<void> {
  try {
    const allIndex = await GroupCoin.find({});
    if (!allIndex.length) return;
    for (const index of allIndex) {
      let indexFund = await IndexFund.findOne({ indexId: index._id });
      if (!indexFund) continue;

      // Fetch real-time prices for all coins in the index
      const coinPrices = await Promise.all(
        index.coins.map(async (coin) => {
          const coinPrice = await indexService().getCoinCurrentPrice(
            coin.address
          );
          return {
            price: parseFloat((coinPrice || 0).toFixed(2)),
            proportion: Number(coin.proportion) / 100,
            name: coin.coinName,
          };
        })
      );

      let marketBasedIndexPrice = coinPrices.reduce((sum, coin) => {
        console.log("price", coin.price, coin.proportion);
        const totalAllocation = indexFund.totalSupply * coin.proportion;
        console.log("totalAllocation", totalAllocation, totalAllocation / coin.price);
        return (
          sum + (totalAllocation * coin.price)
        );
      }, 0);

      let newIndexPrice = marketBasedIndexPrice / indexFund.totalSupply;

      await IndexFund.findOneAndUpdate(
        { indexId: index._id },
        {
          totalSupply: indexFund.totalSupply,
          indexWorth: marketBasedIndexPrice,
        },
        {
          upsert: true,
          new: true,
        }
      );
      // Create a new record in GroupCoinHistory
      await GroupCoinHistory.create({
        price: newIndexPrice,
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
