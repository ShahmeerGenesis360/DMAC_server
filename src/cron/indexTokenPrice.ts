import { GroupCoin, IGroupCoin } from "../models/groupCoin";
import axios from "axios";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { config } from '../config/index';
import { decimals} from "../constants/tokenDecimals"
import {fetchTokenSupply} from "./tokenSupply";
import * as anchor from "@coral-xyz/anchor";

const JUPITER_PRICE_API = "https://api.jup.ag/price/v2";
const { RPC_URL, PROGRAM_ID } = config;
const connection = new Connection(RPC_URL)

function getProgramId() {
  return new anchor.web3.PublicKey(
    PROGRAM_ID as string
  );
}

function getProgramAuthority(mintPublicKey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program_authority"), mintPublicKey.toBuffer()],
    getProgramId()
  )[0];
}

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



export const fetchBalance = async(tokenName: string,tokenPublicKey: string, mintPublicKey: string)=>{
  try{
    const connection = new Connection("https://solana-mainnet.api.syndica.io/api-key/23sqEpy7QkkZTWmodYUZBb4ZBfzcXurKHfeGpKsYZeBFNzj358jPHtfeDpD29vtPtEBt1MeX24JE2HESPBsTbND75TW2g3iFoBK", {
      confirmTransactionInitialTimeout: 60000, // 60 seconds
    });
    const pda = getProgramAuthority(new PublicKey(mintPublicKey))
    const tokenProgramID = await getTokenProgramId(connection, new PublicKey(tokenPublicKey));
    console.log(tokenProgramID,pda ,"tokenProgramId")
    const tokenAccount = await  getAssociatedTokenAddress(
      new PublicKey(tokenPublicKey),
      pda,
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
  
export const calculateIndexPrice = async (index: IGroupCoin) => {
    try {
      console.log("📡 Fetching Index Token Price...");
  
      const solPriceUsd = await getSolPriceFromJupiter();
      console.log(`💰 SOL Price: $${solPriceUsd}`);
  
      let totalPrice = 0;

      const mintPublickey = index.mintPublickey.slice(1, index.mintPublickey.length - 1);
      for (const token of index.coins) {
        console.log(token.address, token.coinName, "tokenDetails")
       
        const balance = await fetchBalance(token.coinName, token.address, mintPublickey)
        const tokenPriceInSol = await getTokenPriceInSol(token.address);
        const tokenPriceInUsd = tokenPriceInSol;
        totalPrice += tokenPriceInUsd * balance;
      }
      
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