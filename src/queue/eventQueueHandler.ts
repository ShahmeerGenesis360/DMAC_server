import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";
import {swapToTknStart, swapToTkn, swapToTknEnd, swapToSol, swapToSolEnd, createWsol} from "../utils/apiRequest"
import {VersionedTransaction, Keypair, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction,Connection, sendAndConfirmTransaction, ComputeBudgetProgram, Transaction, SystemProgram} from '@solana/web3.js'
import { web3,  } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import IDL from "../idl/idl.json"
import { getProvider, Idl, Program, Provider, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {DmacBuyIndexEvent, DmacSellIndexEvent} from "../types/index";
import bs58 from 'bs58';
import {createTransactionBatches, executeBulkSwap} from "../utils/transaction"
import { Record } from "../models/record";
import {AdminReward} from "../models/adminReward";
import {bundleAndSend} from "../utils/jito"
import {createJitoBundle, sendJitoBundle, checkBundleStatus} from "../utils/jitoRpc"
import axios from "axios";
import { getMint } from "@solana/spl-token";

const { PROGRAM_ID, NETWORK , RPC_URL, getKeypair, PRIVATE_KEY } = config;
const connectionUrl: string = RPC_URL as string // Ensure RPC_URL and NETWORK are defined in your config
const connectionUrl2: string =  "https://mainnet.helius-rpc.com/?api-key=3d544bd6-e341-45c7-8b68-3119e83dfbd5"
const connection = new web3.Connection(connectionUrl, 'confirmed');
const connection2 = new web3.Connection(connectionUrl2, 'confirmed')
const connection3 = new web3.Connection("https://mainnet.helius-rpc.com/?api-key=a985f394-000f-4ad1-b48f-71144f5584c9, 'confirmed")
const connections: Connection[] = [connection, connection2]
const decodedPrivateKey = bs58.decode(PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(decodedPrivateKey);
const wallet = new Wallet(keypair)

const provider = new AnchorProvider(connection,wallet, { commitment: "confirmed"});
anchor.setProvider(provider);

const program = new Program(IDL as Idl, provider as Provider );

async function handleCreateIndexQueue(eventData: any): Promise<void> {
    
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
	const url = "https://api.coingecko.com/api/v3/coins/solana?tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";
	const response = await axios.get(url, {
		headers: {
			"x-cg-demo-api-key": "CG-1UEnGitQLXR2qVakGHeyrnKm",
		},
	});

	return response?.data?.market_data?.current_price?.usd;
}

async function handleBuyIndexQueue(
    eventData: DmacBuyIndexEvent
  ): Promise<void> {
    try {
      let globalInstructions: TransactionInstruction[] = [];

      let indexPublicKey = eventData.index_mint.toString();
      // eventData.deposited = "1"


      indexPublicKey = `"${indexPublicKey}"`;
      const index = await GroupCoin.findOne({ mintPublickey: indexPublicKey });
      let mintKeySecret = index.mintKeySecret;
      mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
      const secretKeyUint8Array = new Uint8Array(
        Buffer.from(mintKeySecret, "base64")
      );
      const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
  
      const transaction  = await swapToTknStart(
        program,
        mintkeypair,
        provider as Provider
      );
        console.log(transaction)

      // globalInstructions.push(...swapToTknStartIns);
      const deposited = parseFloat(eventData.deposited) / 1_000_000_000;
      console.log(deposited, eventData.deposited, "amount");
      const solPrice = await fetchSolanaUsdPrice();

      for (const coin of index.coins) {
        const tokenAddress = new PublicKey(coin.address);
        let amount =
          (((coin.proportion / 100) * Number(eventData.deposited)) / solPrice) *
          LAMPORTS_PER_SOL;
        console.log(amount, "before rounding");
        amount = Math.round(amount);
        console.log(amount, tokenAddress, "tokenAddress");
        const { txID } = await swapToTkn(
          program,
          provider as Provider,
          mintkeypair,
          tokenAddress,
          amount
        );
        // // if(count ==1){
          console.log(txID,"swap to token")
          // globalInstructions.push(txI);

        // }
        // count++

        const record = new Record({
          // user: eventData.userAddress,
          type: "deposit", // Enum for transaction type
          indexCoin: index._id,
          amount: amount, // Either deposit or withdrawal amount
          tokenAddress: coin.address,
        });
        await record.save();
      }
      const collectorPublicKeys = index.collectorDetail.map(
        (collectorDetail) => new PublicKey(collectorDetail.collector)
      );

      // const collectorPublicKeys = [new PublicKey("GTru1NYUCZMmZxbyD7R3iB7mRaTnoYAU8GxHj1NYfVnc")]
      
      const tx = await swapToTknEnd(
        program,
        mintkeypair,
        provider as Provider,
        //   keypair,
        collectorPublicKeys
      );
      // globalInstructions.push(...swapToTknEndIns);

      const MAX_INSTRUCTIONS = 3;  // Adjust based on Solana's block size
      const instructionBatches = [];
    //   let versionedTransactions: VersionedTransaction[] = [];
    //   for(let i = 0;i<globalInstructions.length;i++){
    //     const blockhash = await connection.getLatestBlockhash();
    //     const messageV0 = new web3.TransactionMessage({
    //       payerKey: keypair.publicKey,
    //       recentBlockhash: blockhash.blockhash,
    //       instructions: [globalInstructions[i]],
    //     }).compileToV0Message();
    //     const versionedTransaction = new web3.VersionedTransaction(messageV0);
    //     versionedTransaction.sign([keypair]);
    //     // console.log(versionedTransaction, "versionedTransaction")
    //     versionedTransactions.push(versionedTransaction)
    //   }
     
    //   console.log(versionedTransactions)
    //   // const swapEndTrans = versionedTransactions.pop();
    //   // transferTransaction = versionedTransactions.pop();
    //   let batchList = []

    //   batchList = [[versionedTransactions[1], versionedTransactions[2], versionedTransactions[3]], [versionedTransactions[4]]]

    //   // for (let i = 0; i < versionedTransactions.length; i += MAX_INSTRUCTIONS) {
    //   //   batchList.push(versionedTransactions.slice(i, i + MAX_INSTRUCTIONS));
    //   // }
    //   // batchList.push([transferTransaction])
    //   // batchList.push([swapEndTrans])
    //   console.log(batchList, "BATCH LIST")
      
      
    //   for(let i =0;i<batchList.length;i++){
    //     const bundle = await createJitoBundle( batchList[i], keypair)
    //     console.log(bundle, "Bundle1")
    //     const res = await sendJitoBundle(bundle);
    //     console.log(res, "jito res")

    //     let bundleId = res; // Assuming the bundle ID is returned in the response
    //     let status = await checkBundleStatus(res);
    
    // // Polling until bundle is confirmed (status is "landed" or another desired state)
    // while (status && status.status != "Landed") {
    //     console.log(`Waiting for confirmation for bundle ID: ${bundleId}`);
    //     await new Promise(resolve => setTimeout(resolve, 5000));
    //     status = await checkBundleStatus(bundleId);
    // }
    
    // if (status && status.status === "Landed") {
    //     console.log(`Bundle ID ${bundleId} confirmed!`);
    //     await delay(10000);
    // } else {
    //     console.log(`Failed to confirm bundle ID: ${bundleId}`);
    // }

    //   }

    

        // const blockhash = await connection.getLatestBlockhash();
        // console.log(blockhash, "blockHash")

        // const instructionwsol = await createWsol( program, mintkeypair, keypair)
        // const firstBatch = [];
        // firstBatch.push(...swapToTknStartIns)
       
        // const messageV0 = new web3.TransactionMessage({
        //   payerKey: keypair.publicKey,
        //   recentBlockhash: blockhash.blockhash,
        //   instructions: firstBatch,
        // }).compileToV0Message();
  
        // const versionedTransaction = new web3.VersionedTransaction(messageV0);
        // versionedTransaction.sign([keypair]);

        

        // let txid = await connection.sendTransaction(versionedTransaction, {
        //   maxRetries: 2,
        //   skipPreflight: false,
        //   preflightCommitment: 'confirmed',
        // });

        // const confirmation = await connection.confirmTransaction(txid, 'finalized');
        // if (confirmation.value.err) {
        //   console.error(`Transaction failed: ${txid}`);
          
        // } else {
        //   console.log(`Transaction confirmed SwapToTknStart, wsol: ${txid}`);
        // }

      const MAX_RETRIES = 3; 
      const RETRY_DELAY = 5000;

      while (globalInstructions.length > 0) {
        instructionBatches.push(globalInstructions.splice(0, MAX_INSTRUCTIONS));  // Divide into batches
      }

      for (let i = 0; i < instructionBatches.length; i++) {
        console.log(instructionBatches[i], "instructionBatch")
        const blockhash = await connection.getLatestBlockhash();
        console.log(blockhash, "blockHash")
        const instructionsBatch = instructionBatches[i];
        const messageV0 = new web3.TransactionMessage({
          payerKey: keypair.publicKey,
          recentBlockhash: blockhash.blockhash,
          instructions: instructionsBatch,
        }).compileToV0Message();
  
        const versionedTransaction = new web3.VersionedTransaction(messageV0);
        versionedTransaction.sign([keypair]);

        let retryCount = 0;
        let txid: string | null = null;

        while (retryCount < MAX_RETRIES) {
          try {
            txid = await connection.sendTransaction(versionedTransaction, {
              maxRetries: 2,
              skipPreflight: false,
              preflightCommitment: 'confirmed',
            });

            const confirmation = await connection.confirmTransaction(txid, 'finalized');
            if (confirmation.value.err) {
              console.error(`Transaction failed: ${txid}`);
              throw new Error(`Transaction failed: ${txid}`);
            } else {
              console.log(`Transaction confirmed: ${txid}`);
              break; // Exit the retry loop if successful
            }
          }catch (err) {
            retryCount++;
            console.error(`Error sending transaction batch ${i + 1}, retry ${retryCount}/${MAX_RETRIES}:`, err);
            if (retryCount < MAX_RETRIES) {
              await delay(RETRY_DELAY); // Wait before retrying
            } else {
             
              console.error(`Failed to send transaction batch ${i + 1} after ${MAX_RETRIES} retries.`);
            }
          }
        }
      
        if (txid) {
          console.log(`Transaction batch ${i + 1} sent successfully:`, txid);
        } else {
          console.error(`Transaction batch ${i + 1} failed after ${MAX_RETRIES} retries.`);
          break;
        }
      
        await delay(5000); // Delay between batches
      }
        
        
      //   try {
      //     const txid = await connection.sendTransaction(versionedTransaction, { maxRetries: 2, skipPreflight: false, preflightCommitment: 'confirmed' });
      //     const confirmation = await connection.confirmTransaction(txid, 'finalized');
      //     if (confirmation.value.err) {
      //         console.error(`Transaction failed: ${txid}`);
      //         throw new Error(`Transaction failed: ${txid}`);
      //     } else {
      //         console.log(`Transaction confirmed: ${txid}`);
      //     }
      //     console.log(`Transaction batch ${i + 1} sent successfully:`, txid);
      //     await delay(10000);
      //   } catch (err) {
      //     console.log(`Error sending transaction batch ${i + 1}:`, err);
      //     // Handle any failure to send the batch here
      //   }
      // }
  
      index.collectorDetail.forEach(async (item) => {
        const adminReward = new AdminReward({
          adminAddress: item.collector,
          type: "buy",
          amount: Number(eventData.adminFee),
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
      
        let transactions: VersionedTransaction[] = [];
        let globalInstructions: TransactionInstruction[] = [];
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

        for(const coin of index.coins){
            const tokenPrice = await getTokenPrice(coin.address)
            const tokenDecimals = await getTokenDecimals(connection, coin.address);
            console.log(tokenPrice, tokenDecimals, "decimal")
            const tokenAddress = new PublicKey(coin.address);
            // let amount = (coin.proportion /100) * ((Number(eventData.withdrawn) * tokenPrice.sol)  /) 
            let amount = ((Number(eventData.withdrawn) * (coin.proportion /100))/tokenPrice.sol) * Math.pow(10,tokenDecimals); 
            amount = Math.round(amount)
            console.log(amount, tokenAddress, "tokenAddress");
            const txId = await swapToSol(program, provider as Provider, mintkeypair, userPubKey, tokenAddress, amount);
            console.log(txId, "txId")
            // globalInstructions.push(...instructions);
            // transactions.push(txn);

            const record = new Record({
                // user: eventData.userAddress,
                type: "withdrawal", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
        };
        const collectorPublicKeys = index.collectorDetail.map(
          (collectorDetail) => new PublicKey(collectorDetail.collector)
        );
        const txID = await swapToSolEnd(program,mintkeypair,userPubKey, provider as Provider, collectorPublicKeys)
        // transactions.push(txn);
        // globalInstructions.push(...swapToSolEndIns);

        const MAX_INSTRUCTIONS = 3;  // Adjust based on Solana's block size
        const instructionBatches = [];
        while (globalInstructions.length > 0) {
          instructionBatches.push(globalInstructions.splice(0, MAX_INSTRUCTIONS));  // Divide into batches
        }
        const MAX_RETRIES = 3
        // Send each batch as a separate transaction
        for (let i = 0; i < instructionBatches.length; i++) {
          const instructionsBatch = instructionBatches[i];
          const blockhash = await connection.getLatestBlockhash();
          console.log(blockhash, "blockHash")
          const messageV0 = new web3.TransactionMessage({
            payerKey: keypair.publicKey,
            recentBlockhash: blockhash.blockhash,
            instructions: instructionsBatch,
          }).compileToV0Message();
    
          const versionedTransaction = new web3.VersionedTransaction(messageV0);
          versionedTransaction.sign([keypair]);
    
          try {
        
            let retryCount = 0;
            let txid: string | null = null;

            while (retryCount < MAX_RETRIES) {
              try {
                txid = await connection.sendTransaction(versionedTransaction, {
                  maxRetries: 2,
                  skipPreflight: false,
                  preflightCommitment: 'confirmed',
                });

                const confirmation = await connection.confirmTransaction(txid, 'finalized');
                if (confirmation.value.err) {
                  console.error(`Transaction failed: ${txid}`);
                  throw new Error(`Transaction failed: ${txid}`);
                } else {
                  console.log(`Transaction confirmed: ${txid}`);
                  break; // Exit the retry loop if successful
                }
              }catch (err) {
                retryCount++;
                console.error(`Error sending transaction batch ${i + 1}, retry ${retryCount}/${MAX_RETRIES}:`, err);
                if (retryCount < MAX_RETRIES) {
                  await delay(3000); // Wait before retrying
                } else {
                  console.error(`Failed to send transaction batch ${i + 1} after ${MAX_RETRIES} retries.`);
                }
              }
            }
          
            if (txid) {
              console.log(`Transaction batch ${i + 1} sent successfully:`, txid);
            } else {
              console.error(`Transaction batch ${i + 1} failed after ${MAX_RETRIES} retries.`);
            }
          
            await delay(5000); // Delay between batches
          } catch (err) {
            console.log(`Error sending transaction batch ${i + 1}:`, err);
            // Handle any failure to send the batch here
          }
        }
        

        // const messageV0 = new web3.TransactionMessage({
        //   payerKey: keypair.publicKey,
        //   recentBlockhash: blockhash.blockhash,
        //   instructions: globalInstructions,
        // }).compileToV0Message();
    
        // const versionedTransaction = new web3.VersionedTransaction(messageV0);
        // versionedTransaction.sign([keypair]);
    
        // const txid = await connection.sendTransaction(versionedTransaction, { maxRetries: 2, skipPreflight: true, preflightCommitment: 'processed' });
        // console.log(txid, "txid");
        index.collectorDetail.forEach(async (item) => {
          const adminReward = new AdminReward({
            adminAddress: item.collector,
            type: "sell",
            amount: Number(eventData.adminFee),
            indexCoin: index._id,
          });
          await adminReward.save();
        });
        // await bundleAndSend(keypair, transactions, provider as Provider)
        
        // const batches = await createTransactionBatches(transactions)
        // console.log(provider)
        // const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleSellIndexQueue()", error)
        throw error
    }
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue}