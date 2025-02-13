import axios from "axios";
import { config } from '../config/index'

const { HELIUS_API_KEY } = config;


export const fetchTokenSupply = async (tokenMintAddress:string):Promise<number> => {
  try {
    console.log(tokenMintAddress)
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const query = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenSupply",
      params: [tokenMintAddress]
    };

    const response = await axios.post(url, query);
    const supply = response.data?.result?.value?.uiAmount || 0;

    console.log(`🏦 Total Token Supply: ${supply}`);
    return supply;
  } catch (error) {
    console.error("❌ Error fetching token supply:", error.message);
    return 0;
  }
};

