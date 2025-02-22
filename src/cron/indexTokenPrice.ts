import { GroupCoin, IGroupCoin } from "../models/groupCoin";
import axios from "axios";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { config } from '../config/index';
import { decimals} from "../constants/tokenDecimals"
import {fetchTokenSupply} from "./tokenSupply"

const JUPITER_PRICE_API = "https://api.jup.ag/price/v2";
const { RPC_URL } = config;
const connection = new Connection(RPC_URL)

export const getSolPriceFromJupiter = async () => {
  try {
    const url = `${JUPITER_PRICE_API}?ids=So11111111111111111111111111111111111111112`;
    const resp = await axios.get(url);

    return resp.data.data["So11111111111111111111111111111111111111112"]?.price || 0;
  } catch (error) {
    console.error("❌ Error fetching SOL price from Jupiter:", error.message);
    return 0;
  }
};




async function getTokenPrice(address: string){
  const resp = await axios.get(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,${address}`)
  return {
    sol: resp.data.data["So11111111111111111111111111111111111111112"]?.price,
    token:resp.data.data[address]?.price
  };
}


const getTokenProgramId = async (
  connection: Connection,
  tokenPublicKey: PublicKey
): Promise<PublicKey> => {
  const accountInfo = await connection.getAccountInfo(tokenPublicKey);
  if (!accountInfo) {
    throw new Error("Token account not found.");
  }
  if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID;
  } else if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  } else {
    throw new Error("Unknown token program for the provided account.");
  }
};



export const fetchBalance = async(tokenName: string,tokenPublicKey: string, pdaAddress: string)=>{
  try{

    const tokenProgramID = await getTokenProgramId(connection, new PublicKey(tokenPublicKey));
    console.log(tokenProgramID,pdaAddress ,"tokenProgramId")
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(tokenPublicKey),
      new PublicKey(pdaAddress),
      true,
      tokenProgramID
    );
    console.log(tokenAccount, "accountInfo1")
    const accountInfo = await getAccount(
      connection,
      tokenAccount,
      "confirmed",
      tokenProgramID
    );
      console.log(accountInfo, "accountInfo")
    const tokenBalance = Number(accountInfo.amount) / (10 ** decimals[tokenName]);
    console.log(tokenBalance, "tokenBalance")
    return tokenBalance;
  }catch(err){
    console.error("❌ Error fetching token balance:", err);
    return 0;
  }
}


export const getTokenPriceInSol = async (tokenAddress:string) => {
  try {
    const url = `${JUPITER_PRICE_API}?ids=${tokenAddress}`;
    const resp = await axios.get(url);

    return resp.data.data[tokenAddress]?.price || 0;
  } catch (error) {
    console.error(`❌ Error fetching price for ${tokenAddress}:`, error.message);
    return 0;
  }
};
  
export const calculateIndexPrice = async (index: IGroupCoin, pdaAddress: string) => {
    try {
      console.log("📡 Fetching Index Token Price...");
  
      const solPriceUsd = await getSolPriceFromJupiter();
      console.log(`💰 SOL Price: $${solPriceUsd}`);
  
      let totalPrice = 0;

  
      for (const token of index.coins) {
        console.log(token.address, token.coinName, "tokenDetails")
        const balance = await fetchBalance(token.coinName, token.address, pdaAddress)
        const tokenPriceInSol = await getTokenPriceInSol(token.address);
        const tokenPriceInUsd = tokenPriceInSol;
        totalPrice += tokenPriceInUsd * balance;
      }
      const mintPublickey = index.mintPublickey.slice(1, index.mintPublickey.length - 1);
      const supply = await fetchTokenSupply(mintPublickey)
      const price = totalPrice/ supply;
      console.log(`📊 Final Index Token Price: $${price.toFixed(4)} USD`);
      return price;
    } catch (error) {
      console.error("❌ Error calculating Index Token price:", error.message);
      return 0;
    }
};
  
// (async () => {
//   const data = await getTokenPrice("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm");
//   const data = await calculateIndexPrice("", "2LYa8F6T2iPd4uaxM7hu3ctKXXtHnBPgP5YzCETrFgiT");
//   console.log(data);
// })();