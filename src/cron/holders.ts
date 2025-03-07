import { config } from '../config/index';
const { HELIUS_API_KEY } = config;
const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export const getTokenHolders = async (mintPubKey: string):Promise<{ holders: number, topHolders: { owner: string, balance: number }[] }> => {
  const fetch = (await import("node-fetch")).default;
  let page = 1;
  let allOwners = new Set();
  let holderBalances: { owner: string, balance: number }[] = [];

  while (true) {
    const response: any = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getTokenAccounts",
        id: "helius-test",
        params: {
          page: page,
          limit: 1000,
          displayOptions: {},
          mint: mintPubKey,
        },
      }),
    });
    const data = await response.json();

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
  }
  const topHolders = holderBalances.sort((a, b) => b.balance - a.balance).slice(0, 10);

  console.log(`Total unique owners: ${allOwners.size}`);
  console.log(`Top 10 holders:`, topHolders);

  return {
    holders: allOwners.size,
    topHolders: topHolders,
  };
};
