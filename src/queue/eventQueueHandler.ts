import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";
import {swapToTknStart, swapToTkn, swapToTknEnd, swapToSol, swapToSolEnd, rebalanceIndexStart, rebalanceIndex, rebalanceIndexEnd, fetchIndexInfo, createWsol, initialize} from "../utils/apiRequest"
import {VersionedTransaction, Keypair, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction,Connection} from '@solana/web3.js'
import { web3,  } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import IDL from "../idl/idl.json"
import { Idl, Program, Provider, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {DmacBuyIndexEvent, DmacSellIndexEvent, DmacCreateIndexEvent, RebalanceEvent} from "../types/index";
import bs58 from 'bs58';
import { Record } from "../models/record";
import {AdminReward} from "../models/adminReward";
import axios from "axios";
import { getMint } from "@solana/spl-token";
import { getOrUpdateFund } from "../utils";
import { IndexFund } from "../models/indexFund";
import {sendToProgramAuthority} from "../utils/web3"

const {  RPC_URL, PRIVATE_KEY, PROGRAM_ID, RPC_URL2 } = config;
const connectionUrl: string = RPC_URL as string // Ensure RPC_URL and NETWORK are defined in your config
const connection = new web3.Connection(connectionUrl, 'confirmed');
const connection2 = new web3.Connection(RPC_URL2, 'confirmed')
const decodedPrivateKey = bs58.decode(PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(decodedPrivateKey);
const wallet = new Wallet(keypair)

const provider1 = new AnchorProvider(connection,wallet, { commitment: "confirmed"});
const provider2 = new AnchorProvider(connection2, wallet,{commitment: "confirmed"});
let provider = provider1
const providers = [provider1, provider2]
// anchor.setProvider(provider);

const program = new Program(IDL as Idl, provider as Provider );

async function handleCreateIndexQueue(eventData: any): Promise<void> {
    
}

const decimals: Record<string, number>  = {
  MOTHER: 6,
  POPCAT: 9,
  WIF: 6,
  FWOG: 6,
  RETARDIO:6,
  MICHI: 6,
  Ai16z: 9,
  Griffain: 6,
  AIXBT: 8,
  SWARMS: 6,
  ELIZA: 6,
  ARC: 6,
}

function getProgramAuthority(mintPublicKey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program_authority"), mintPublicKey.toBuffer()],
    getProgramId()
  )[0];
}

function getProgramId() {
  return new anchor.web3.PublicKey(
    process.env.PROGRAM_ID as string
  );
}

async function getTransactionReceipt(signature:string) {
	const receipt: any = await connection.getTransaction(signature, {
		maxSupportedTransactionVersion: 0,
	});

	if (!receipt) {
		throw new Error(`failed to fetch transaction receipt for: ${signature}`);
	}
  console.log(receipt, "receipt")
  console.log(receipt.transaction.message.accountKeys[0], "messages")
	return receipt.transaction.message.accountKeys[0]
}

async function getTokenDecimals(connection: Connection, tokenAddress: string) {
  try {
    // Create the token object from the address
    let mintAccount = await getMint(connection, new PublicKey(tokenAddress));

    console.log(`Token decimals: ${mintAccount.decimals}`);
    return mintAccount.decimals;
  } catch (error) {
    console.error("Error getting token decimals:", error);
    return null;
  }
}

async function getTokenPrice(address: string){
  const resp = await axios.get(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,${address}`)
  return {
    sol: resp.data.data["So11111111111111111111111111111111111111112"]?.price,
    token:resp.data.data[address]?.price
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSolanaUsdPrice() {
  try{
    const url = "https://api.coingecko.com/api/v3/coins/solana?tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";
    const response = await axios.get(url, {
      headers: {
        "x-cg-demo-api-key": "CG-1UEnGitQLXR2qVakGHeyrnKm",
      },
    });

	  return response?.data?.market_data?.current_price?.usd;
  }catch(error){
    return null;
  }
}

async function confirmFinalized(txHash: string) {
  let status = null;
  let attempts = 0;
  const maxAttempts = 10; // Limit retries to avoid infinite loops

  while (attempts < maxAttempts) {
    try {
      console.log(`Checking status for transaction: ${txHash}`);
      const txStatus = await connection.getSignatureStatus(txHash, { searchTransactionHistory: true });

      if (txStatus.value && txStatus.value.confirmationStatus === "finalized") {
        console.log(`Transaction ${txHash} is finalized ✅`);
        return;
      }
    } catch (error) {
      console.log(`Error checking status of ${txHash}: ${error.message}`);
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
  }

  console.log(`Transaction ${txHash} did not finalize in time ❌`);
}

async function handleCreateIndex(eventData: DmacCreateIndexEvent){
  try{
    const tx = await sendToProgramAuthority(program, keypair, provider)
    console.log(tx, "sending tranaction")
  }catch(err){
    console.log(err)
  }
}

async function handleBuyIndexQueue(
    eventData: DmacBuyIndexEvent
  ): Promise<void> {
    try {
      let MAX_RETRIES = 5
      let allTxHashes: string[] = []
      let indexPublicKey = eventData.index_mint.toString();
      indexPublicKey = `"${indexPublicKey}"`;
      const index = await GroupCoin.findOne({ mintPublickey: indexPublicKey });
      let mintKeySecret = index.mintKeySecret;
      mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
      const secretKeyUint8Array = new Uint8Array(
        Buffer.from(mintKeySecret, "base64")
      );
      const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
      let attempt = 0;
      let swapToTknStartTxHash = null;

      while(attempt < MAX_RETRIES){
        console.log("swap to token start")
        attempt += 1;
        console.log(`Attempt #${attempt}`);

        swapToTknStartTxHash  = await swapToTknStart(
          program,
          mintkeypair,
          provider as Provider
        );
        if (swapToTknStartTxHash !== null) {
          console.log(`Transaction completed successfully: ${swapToTknStartTxHash}`);
          break;
        }
        else{
          console.log(`Attempt Failed :( `)
          if(attempt==MAX_RETRIES){
            console.log(`Transaction failed after MAX attempt`)
            return
            
          }
        } 
      }
      console.log(index.pda, "pda")
      const pda = index.pda.slice(1, index.pda.length - 1);
      console.log(pda, "pda1")

      // let createwsolTxId = null;
      // let entries = 0;
      // while(entries < MAX_RETRIES){
      //   console.log("wsol sending")
      //   entries += 1;
      //   console.log(`Attempt #${entries}`);
      //   createwsolTxId = await createWsol(program, mintkeypair, keypair, provider);
      //   if (createwsolTxId !== null) {
      //     console.log(`Transaction completed successfully: ${createwsolTxId}`);
      //     break;
      //   }
      //   else{
      //     console.log(`Attempt Failed :( `)
      //     if(attempt==MAX_RETRIES){
      //       console.log(`Transaction failed after MAX attempt`)
      //       return
            
      //     }
      //   }
      // }
      

      for (const coin of index.coins) {
        let tries = 0
        let txID = null;
        const tokenAddress = new PublicKey(coin.address);
        let solPrice = null
        let amount;
        
        while(tries<MAX_RETRIES){
          tries += 1;
          console.log(`Attempt #${tries} swap token ${coin.coinName}`);

          solPrice = await fetchSolanaUsdPrice();
          if(solPrice==null){
            console.log("Didnt get the solprice")
            continue;
          }

          amount =
          (((coin.proportion / 100) * Number(eventData.deposited)) / solPrice) *
          LAMPORTS_PER_SOL;
          console.log(amount, "before rounding");
          amount = Math.round(amount);
          console.log(amount, tokenAddress, "tokenAddress");

          txID = await swapToTkn(
            program,
            provider as Provider,
            mintkeypair,
            tokenAddress,
            amount
          );
          if(txID!=null){
            console.log(`Transaction completed successfully: ${txID}`);
            allTxHashes.push(txID);
            break;
          }
          else{
            console.log(`Attempt Failed :( `)
            // provider = providers[Math.floor(Math.random() * providers.length)];
            if(tries==MAX_RETRIES){
              console.log(`Transaction failed after MAX attempt`)
              return
              
            }
          }
        }
        let fund = await getOrUpdateFund(index._id);
        const fee = parseFloat(eventData.deposited) * 0.01;
        const netDeposit = parseFloat(eventData.deposited) - fee;

        let tokensMinted;
        if (fund.totalSupply === 0) {
          tokensMinted = netDeposit;
        } else {
          tokensMinted = (netDeposit * fund.totalSupply) / fund.indexWorth;
        }

        fund.totalSupply += tokensMinted;
        fund.indexWorth += netDeposit;
        await IndexFund.findOneAndUpdate({ indexId: index._id }, fund, {
          upsert: true,
          new: true,
        });
        const record = new Record({
          // user: eventData.userAddress,
          type: "deposit", // Enum for transaction type
          indexCoin: index._id,
          amount: (coin.proportion / 100) * Number(eventData.deposited), // Either deposit or withdrawal amount
          tokenAddress: coin.address,
        });
        await record.save();
        
      }
      const collectorPublicKeys = index.collectorDetail.map(
        (collectorDetail) => new PublicKey(collectorDetail.collector)
      );

      for (const txHash of allTxHashes) {
        await confirmFinalized(txHash);
      }

      let tries = 0;
      let swapToTknEndTxHash = null
      while(tries<MAX_RETRIES){
        tries += 1;
        console.log(`Attempt #${tries} swap to tokenEnd`);
        swapToTknEndTxHash = await swapToTknEnd(
          program,
          provider as Provider,
          mintkeypair,
          collectorPublicKeys
        );
        if(swapToTknEndTxHash!=null){
          console.log(`Transaction completed successfully: ${swapToTknEndTxHash}`);
          break;
        }
        else{
          console.log(`Attempt Failed :( `)
          if(tries==MAX_RETRIES){
            console.log(`Transaction failed after MAX attempt`)
            return
            
          }
        }
      }
      const solPrice = await fetchSolanaUsdPrice();
      index.collectorDetail.forEach(async (item) => {
        const adminReward = new AdminReward({
          adminAddress: item.collector,
          type: "buy",
          amount: (Number(eventData.adminFee) / LAMPORTS_PER_SOL) * solPrice,
          indexCoin: index._id,
        });
        await adminReward.save();
      
      });
    } catch (error) {
      console.log("Error: EventQueueHandler.ts, handleBuyIndexQueue()", error);
      throw error;
    }
  }

async function handleSellIndexQueue(eventData: DmacSellIndexEvent): Promise<void> {
    try{
        const MAX_RETRIES = 5;
        let allTxHash = [];
        let userPubKey:PublicKey = await getTransactionReceipt(eventData.signature)
        console.log(userPubKey, "userPub")
        console.log(eventData, "Event data")

        let indexPublicKey = eventData.index_mint.toString();
        indexPublicKey = `"${indexPublicKey}"`;
        const index = await GroupCoin.findOne({ mintPublickey:indexPublicKey });
        let mintKeySecret = index.mintKeySecret;
        console.log(index)
        mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
        console.log(mintKeySecret)
        const secretKeyUint8Array = new Uint8Array(Buffer.from(mintKeySecret, "base64"))
        const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
        const pda = index.pda.slice(1, index.pda.length - 1);
        for(const coin of index.coins){
            let tokenDecimals;
            let tokenPrice;
            let tries = 0;
            let txId = null;
            const tokenAddress = new PublicKey(coin.address);
            let amount;
            
            while(tries < MAX_RETRIES){
            
              tries += 1;
              console.log(`Attempt #${tries}`);
              tokenPrice = await getTokenPrice(coin.address)
              console.log(coin.coinName, coin.address, "name address")
              tokenDecimals = decimals[coin.coinName]
              console.log(tokenPrice, tokenDecimals, "decimal")
              amount = ((((Number(eventData.withdrawn) + (Number(eventData.adminFee)/index.coins.length)) * (coin.proportion /100)) * tokenPrice.sol)/tokenPrice.token) * Math.pow(10,tokenDecimals); 
              console.log( Number(eventData.adminFee), "usdc value")
              amount = Math.round(amount);
              console.log(amount, tokenAddress, "tokenAddress");
              txId = await swapToSol(program, provider as Provider, mintkeypair, userPubKey, tokenAddress, amount, pda);
              if(txId!=null){
                console.log(`Transaction completed successfully: ${txId}`);
                allTxHash.push(txId)
                break;
              }
              else{
                console.log(`Attempt Failed :( `)
                if(tries==MAX_RETRIES){
                  console.log(`Transaction failed after MAX attempt`)
                  return
                  
                }
              }
            }
            

        
            let fund = await getOrUpdateFund(index._id);
            const proportionalSharePercentage = Number(eventData?.withdrawn) / fund.totalSupply;
            const withdrawalAmount = proportionalSharePercentage * fund.indexWorth;

            // Apply the transaction fee (1% in this case)
            const fee = withdrawalAmount * 0.01; // 1% fee
            const netWithdrawal = withdrawalAmount - fee;

            // Update the fund's total supply and worth after the withdrawal
            fund.totalSupply -= Number(eventData?.withdrawn);
            fund.indexWorth -= withdrawalAmount;

      // Update the fund in the database
            await IndexFund.findOneAndUpdate({ indexId: index._id }, fund, {
              upsert: true,
              new: true,
            });

            const recordAmount = Number(eventData.withdrawn) * (coin.proportion /100) * tokenPrice.sol
            console.log(recordAmount, "record amount")
            const record = new Record({
                // user: eventData.userAddress,
                type: "withdrawal", // Enum for transaction type
                indexCoin: index._id,
                amount: recordAmount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();

        };
        const collectorPublicKeys = index.collectorDetail.map(
          (collectorDetail) => new PublicKey(collectorDetail.collector)
        );
        for (const txHash of allTxHash) {
          await confirmFinalized(txHash);
        }

        let tries = 0;
        let txID = null;
        while(tries<MAX_RETRIES){
          txID = await swapToSolEnd(program,mintkeypair,userPubKey, provider as Provider, collectorPublicKeys)
          if(txID!=null){
            console.log(`Transaction completed successfully: ${txID}`);
            break;
          }
          else{
            console.log(`Attempt Failed :( `)
            if(tries==MAX_RETRIES){
              console.log(`Transaction failed after MAX attempt`)
              return;
            }
          }
        }
        
        // transactions.push(txn);
        // globalInstructions.push(...swapToSolEndIns);

        // const MAX_INSTRUCTIONS = 3;  // Adjust based on Solana's block size
        // const instructionBatches = [];
        // while (globalInstructions.length > 0) {
        //   instructionBatches.push(globalInstructions.splice(0, MAX_INSTRUCTIONS));  // Divide into batches
        // }
        // // const MAX_RETRIES = 3
        // // Send each batch as a separate transaction
        // for (let i = 0; i < instructionBatches.length; i++) {
        //   const instructionsBatch = instructionBatches[i];
        //   const blockhash = await connection.getLatestBlockhash();
        //   console.log(blockhash, "blockHash")
        //   const messageV0 = new web3.TransactionMessage({
        //     payerKey: keypair.publicKey,
        //     recentBlockhash: blockhash.blockhash,
        //     instructions: instructionsBatch,
        //   }).compileToV0Message();
    
        //   const versionedTransaction = new web3.VersionedTransaction(messageV0);
        //   versionedTransaction.sign([keypair]);
    
        //   try {
        
        //     let retryCount = 0;
        //     let txid: string | null = null;

        //     while (retryCount < MAX_RETRIES) {
        //       try {
        //         txid = await connection.sendTransaction(versionedTransaction, {
        //           maxRetries: 2,
        //           skipPreflight: false,
        //           preflightCommitment: 'confirmed',
        //         });

        //         const confirmation = await connection.confirmTransaction(txid, 'finalized');
        //         if (confirmation.value.err) {
        //           console.error(`Transaction failed: ${txid}`);
        //           throw new Error(`Transaction failed: ${txid}`);
        //         } else {
        //           console.log(`Transaction confirmed: ${txid}`);
        //           break; // Exit the retry loop if successful
        //         }
        //       }catch (err) {
        //         retryCount++;
        //         console.error(`Error sending transaction batch ${i + 1}, retry ${retryCount}/${MAX_RETRIES}:`, err);
        //         if (retryCount < MAX_RETRIES) {
        //           await delay(3000); // Wait before retrying
        //         } else {
        //           console.error(`Failed to send transaction batch ${i + 1} after ${MAX_RETRIES} retries.`);
        //         }
        //       }
        //     }
          
        //     if (txid) {
        //       console.log(`Transaction batch ${i + 1} sent successfully:`, txid);
        //     } else {
        //       console.error(`Transaction batch ${i + 1} failed after ${MAX_RETRIES} retries.`);
        //     }
          
        //     await delay(5000); // Delay between batches
        //   } catch (err) {
        //     console.log(`Error sending transaction batch ${i + 1}:`, err);
        //     // Handle any failure to send the batch here
        //   }
        // }
        const solPrice = await fetchSolanaUsdPrice();
        index.collectorDetail.forEach(async (item) => {
          const adminReward = new AdminReward({
            adminAddress: item.collector,
            type: "sell",
            amount: Number(eventData.adminFee) * solPrice,
            indexCoin: index._id,
          });
          await adminReward.save();
        });
      
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleSellIndexQueue()", error)
        throw error
    }
}

async function handleRebalanceIndex(eventData: RebalanceEvent):  Promise<void> {
  try{
    let allTxHash: string[] = []
    console.log(eventData, "event data")
    const MAX_RETRIES = 5
    const index = await GroupCoin.findById(eventData.indexId);
    console.log(index)
    let attempt = 0;
    let swapToTknStartRebalanceTxHash = null;
    let mintKeySecret = index.mintKeySecret;
    mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
    const secretKeyUint8Array = new Uint8Array(
        Buffer.from(mintKeySecret, "base64")
    );
    const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
    const weights = eventData.coins.map((coin)=>{
      return new anchor.BN(coin.proportion*100)
    })
    console.log(weights)
    const programAuthority = getProgramAuthority(mintkeypair.publicKey)
    console.log(programAuthority, "progAth")
    const initbalance  = await connection.getBalance(programAuthority)
    console.log(initbalance, "init balance")
    console.log(weights, "weights")
    while(attempt < MAX_RETRIES){
      console.log("swap to token start rebalance")
      attempt += 1;
      console.log(`Attempt #${attempt}`);
      swapToTknStartRebalanceTxHash  = await rebalanceIndexStart(program, mintkeypair, weights,  provider as Provider );
      if (swapToTknStartRebalanceTxHash !== null) {
        console.log(`Transaction completed successfully: ${swapToTknStartRebalanceTxHash}`);
        break;
      }
      else{
        console.log(`Attempt Failed :( `)
        if(attempt==MAX_RETRIES){
          console.log(`Transaction failed after MAX attempt`)
          return
            
        }
      } 
    }

    let i = 0
    let totalBuy = 0
    const pda = index.pda.slice(1, index.pda.length - 1);
    for(const coin of index.coins){
      let tries = 0
      let txId = null;
      const tokenAddress = new PublicKey(coin.address);

      // const data = await fetchIndexInfo(connection, mintkeypair.publicKey, new PublicKey(PROGRAM_ID))
      // console.log(data, "pda data")

      while(tries < MAX_RETRIES){
        console.log("Attempting rebalance swap token ", coin.coinName)
        tries++
        console.log(`Attempt #${tries}`);; 
        
        // const data = await fetchIndexInfo(connection, mintkeypair.publicKey, PROGRAM_ID)
        // console.log(data)
        const solPrice = await fetchSolanaUsdPrice();
        let percent = eventData.coins[i].proportion - coin.proportion
        console.log(percent, "percent")
        const buy = percent>0? true: false
        let amount;
        if(percent == 0){
         
          break;
        }
        if(buy){
          console.log("skipping buy")
          break
        }else{
          const tokenDecimals = decimals[coin.coinName]
          percent = - percent;
          
          const tokenPrice = await getTokenPrice(coin.address)
          amount = (percent/100) * index.marketCap * Math.pow(10, tokenDecimals)/ tokenPrice.token;
          amount = Math.round(amount);
        }
        
        
        console.log(amount, "amount-rebalance")
        txId = await rebalanceIndex(program, provider as Provider, mintkeypair, tokenAddress, buy, amount, pda);
        if (txId !== null) {
          console.log(`Transaction completed successfully: ${txId}`);
          totalBuy+=percent
          allTxHash.push(txId)
          break;
        }
        else{
          console.log(`Attempt Failed :( `)
          if(attempt==MAX_RETRIES){
            console.log(`Transaction failed after MAX attempt`)
            return
              
          }
        } 
      }
      i++
    }

    i = 0;
    for(const coin of index.coins){
      let tries = 0
      let txId = null;
      const tokenAddress = new PublicKey(coin.address);

      while(tries < MAX_RETRIES){
        console.log("Attempting rebalance swap token ", coin.coinName)
        tries++
        console.log(`Attempt #${tries}`);; 
        
        // const data = await fetchIndexInfo(connection, mintkeypair.publicKey, PROGRAM_ID)
        // console.log(data)
        const solPrice = await fetchSolanaUsdPrice();
        console.log(eventData.coins[i])
        let percent = eventData.coins[i].proportion - coin.proportion
        console.log(percent, "percent")
        const buy = percent>0? true: false
        let amount;
        if(percent == 0){
          break;
        }
        if(buy){
          const curBalance  = await connection.getBalance(programAuthority)
          console.log(curBalance, "curbalance")
          let balance = curBalance-initbalance;
    
          amount = balance * (percent/totalBuy)
          console.log(percent/totalBuy, "percent/total")
          // amount = (percent/100) * index.marketCap * LAMPORTS_PER_SOL/solPrice;
          amount = Math.round(amount);
        }else{
          console.log("skipping sell")
          break;
        }
        
        
        console.log(amount, "amount-rebalance")
        txId = await rebalanceIndex(program, provider as Provider, mintkeypair, tokenAddress, buy, amount, pda);
        if (txId !== null) {
          console.log(`Transaction completed successfully: ${txId}`);
          totalBuy -= percent
          allTxHash.push(txId)
          break;
        }
        else{
          console.log(`Attempt Failed :( `)
          if(attempt==MAX_RETRIES){
            console.log(`Transaction failed after MAX attempt`)
            return
              
          }
        } 
      }
      i++
    }


    for (const txHash of allTxHash) {
      await confirmFinalized(txHash);
    }

    let tries = 0;
    let txId = null;
    while(tries < MAX_RETRIES){
      console.log("Attempting rebalance end  ")
      tries++
      console.log(`Attempt #${tries}`);
     
      txId = await rebalanceIndexEnd(program, mintkeypair);
      if (txId !== null) {
        console.log(`Transaction completed successfully: ${txId}`);
        break;
      }
      else{
        console.log(`Attempt Failed :( `)
        if(attempt==MAX_RETRIES){
          console.log(`Transaction failed after MAX attempt`)
          return
            
        }
      } 
    }


    const updatedGroupCoin = await GroupCoin.findByIdAndUpdate(
      eventData.indexId,
      { $set: { coins: eventData.coins } }, // Replace all coins
      { new: true }
    );

    // if (!updatedGroupCoin) {
    //   console.log("GroupCoin not found");
    //   return null;
    // }

    // console.log("Updated All Coins:", updatedGroupCoin);

  }catch(err){
    console.log(err)
  }
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue, handleRebalanceIndex}