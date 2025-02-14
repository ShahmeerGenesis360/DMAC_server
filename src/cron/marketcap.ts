import { IGroupCoin } from "../models/groupCoin";
import { calculateIndexPrice } from "./indexTokenPrice"
import  { fetchTokenSupply } from "./tokenSupply";

export const calculateMarketCap = async (index: IGroupCoin, pdaAddress: string) => {
  try {
    console.log("📡 Fetching Market Cap...");
    const mintPublickey = index.mintPublickey.slice(1, index.mintPublickey.length - 1);
    const supply = await fetchTokenSupply(mintPublickey);
    const price = await calculateIndexPrice(index, pdaAddress);
    const marketCap = supply * price;

    console.log(`📊 Market Cap: $${marketCap.toFixed(4)} USD`);
    return marketCap;
  } catch (error) {
    console.error("❌ Error calculating market cap:", error.message);
    return 0;
  }
};


module.exports = { calculateMarketCap };