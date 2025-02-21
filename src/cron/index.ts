import cron from "node-cron";
import { IndexFund } from "../models/indexFund";
import { LiquidityLocked } from "../models/liquidityLocked";
import { GroupCoin } from "../models/groupCoin";
import { GroupCoinHistory } from "../models/groupCoinHistory";
import indexService from "../service/indexService";
import { fetchTokenSupply } from "./tokenSupply";
import { calculateIndexPrice } from "./indexTokenPrice";
import {getTokenHolders} from "./holders";
import {calculateMarketCap} from "./marketcap";
import {Price} from '../models/price'

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

async function updateCoins(): Promise<void>{
  try{
    const allIndex = await GroupCoin.find({});
    if (!allIndex.length) return;
    for (const index of allIndex) {
      const mintPublickey = index.mintPublickey.slice(1, index.mintPublickey.length - 1);
      const supply = await fetchTokenSupply(mintPublickey);
      const holders = await getTokenHolders(mintPublickey);
      const pdaAddress = index.pda.slice(1, index.mintPublickey.length - 1);
      const price = await calculateIndexPrice(index,pdaAddress);
      const marketCap = await calculateMarketCap(index, pdaAddress);
      await GroupCoin.findOneAndUpdate( { _id: index._id },
        {
          holders: holders,
          supply: supply,
          marketCap: marketCap,
          price: price,
        },
        {
          upsert: true,
          new: true,
        })
      await Price.create({
          price: price,
          time: Date.now(), // Current time in seconds
          indexId: index._id,
      });
    }
      
  }catch(err){
    console.error("Error updating GroupCoinHistory:", err);
  }
}

async function updateTotalValueLocked(): Promise<void>{
  try{
    const allIndex = await GroupCoin.find({});
    let totalSum = 0;
    for (const index of allIndex) {
      totalSum += index.marketCap
    }
    console.log(totalSum, "total liquidity")
    await LiquidityLocked.create({
      liquidity: totalSum,
      time: Date.now(),
    })

  }catch(err){
    console.error("Error updating total value locked:", err);
  }
}

const cronSchedule = "*/30 * * * * *";
const cronSchedule2 = "*/5 * * * *";
const job = cron.schedule(cronSchedule, updateGroupCoinHistory);
const job2 = cron.schedule(cronSchedule, updateCoins);
const job3 = cron.schedule(cronSchedule2, updateTotalValueLocked);
job.start();
job2.start();
job3.start();
