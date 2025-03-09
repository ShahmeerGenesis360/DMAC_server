import axios from 'axios';
import { config } from '../config/index';

const { HELIUS_API_KEY } = config;
const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export const getTokenHolders = async (mintPubKey: string): Promise<{ holders: number, topHolders: { owner: string, balance: number }[] }> => {
  let page = 1;
  let allOwners = new Set();
  let holderBalances: { owner: string, balance: number }[] = [];

  while (true) {
    try {
      const response = await axios.post(url, {
        jsonrpc: "2.0",
        method: "getTokenAccounts",
        id: "helius-test",
        params: {
          page: page,
          limit: 1000,
          displayOptions: {},
          mint: mintPubKey,
        },
      });

      const data = response.data;

      if (!data.result || data.result.token_accounts.length === 0) {
        console.log(`No more results. Total pages: ${page - 1}`);
        break;
      }

      console.log(`Processing results from page ${page}`);
      data.result.token_accounts.forEach((account: any) => {
        allOwners.add(account.owner); // Add unique owner
        const balance = parseFloat(account.amount) || 0;
        holderBalances.push({ owner: account.owner, balance });
      });

      page++;
    } catch (error) {
      console.error(`Error fetching data on page ${page}:`, error.message);
      break;
    }
  }

  const topHolders = holderBalances.sort((a, b) => b.balance - a.balance).slice(0, 10);

  console.log(`Total unique owners: ${allOwners.size}`);
  console.log(`Top 10 holders:`, topHolders);

  return {
    holders: allOwners.size,
    topHolders: topHolders,
  };
};
