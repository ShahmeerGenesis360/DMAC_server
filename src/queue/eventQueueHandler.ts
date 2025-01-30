import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";
import {swapToTknStart, swapToTkn, swapToTknEnd, swapToSol, swapToSolEnd} from "../utils/apiRequest"
import {VersionedTransaction, Keypair, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction,Connection, sendAndConfirmTransaction} from '@solana/web3.js'
import {AnchorProvider, web3, Wallet } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import IDL from "../idl/idl.json"
import { Idl, Program, Provider } from "@coral-xyz/anchor";
import {DmacBuyIndexEvent, DmacSellIndexEvent} from "../types/index";
import bs58 from 'bs58';
import {createTransactionBatches, executeBulkSwap} from "../utils/transaction"
import { Record } from "../models/record";
import {AdminReward} from "../models/adminReward";
import {bundleAndSend} from "../utils/jito"
import {createJitoBundle, sendJitoBundle, checkBundleStatus} from "../utils/jitoRpc"
import axios from "axios";
import { getOrUpdateFund } from "../utils";
import { IndexFund } from "../models/indexFund";

const { PROGRAM_ID, NETWORK , RPC_URL, getKeypair, PRIVATE_KEY } = config;
const connectionUrl: string = RPC_URL as string // Ensure RPC_URL and NETWORK are defined in your config
const connection = new web3.Connection(connectionUrl, 'confirmed');
const decodedPrivateKey = bs58.decode(PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(decodedPrivateKey);
const wallet = new Wallet(keypair)

const provider = new AnchorProvider(connection,wallet, { commitment: "confirmed"});
anchor.setProvider(provider);

const program = new Program(IDL as Idl, provider as Provider );

async function handleCreateIndexQueue(eventData: any): Promise<void> {
    
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
      const blockhash = await connection.getLatestBlockhash();
      console.log(blockhash, "blockHash")
      let indexPublicKey = eventData.index_mint.toString();
      indexPublicKey = `"${indexPublicKey}"`;
      const index = await GroupCoin.findOne({ mintPublickey: indexPublicKey });
      let mintKeySecret = index.mintKeySecret;
      mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
      const secretKeyUint8Array = new Uint8Array(
        Buffer.from(mintKeySecret, "base64")
      );
      const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
  
      // const { versionedTransaction, swapToTokenStartIns } = await swapToTknStart(
      //   program,
      //   mintkeypair,
      //   provider as Provider,
      //   keypair
      // ); // first transaction
  
      const { instructions: swapToTknStartIns } = await swapToTknStart(
        program,
        mintkeypair,
        provider as Provider
      );
      // transactions.push(versionedTransaction);
      globalInstructions.push(...swapToTknStartIns);
      // const txId = await connection.sendTransaction(versionedTransaction);
      // console.log(${txId}, "hellooooo");
      // eventData.deposited = "2"
      // const privateKeyBuffer = bs58.decode(mintKeySecret);
      // const mintkeypair = Keypair.fromSecretKey(privateKeyBuffer);
      const deposited = parseFloat(eventData.deposited) / 1_000_000_000;
      console.log(deposited, eventData.deposited, "amount");
      const solPrice = await fetchSolanaUsdPrice();
      for (const coin of index.coins) {
        const tokenAddress = new PublicKey(coin.address);
        const accountInfo = await connection.getAccountInfo(tokenAddress);
        const mintData = accountInfo.data;
        const decimals = mintData[44];
        let amount =
          (((coin.proportion / 100) * Number(eventData.deposited)) / solPrice) *
          LAMPORTS_PER_SOL;
        console.log(amount, "before rounding");
        amount = Math.round(amount);
        console.log(amount, tokenAddress, "tokenAddress");
        const { instructions: swapToTknIns } = await swapToTkn(
          program,
          provider as Provider,
          mintkeypair,
          tokenAddress,
          amount
          // keypair
        );
        // const txId = await connection.sendTransaction(tx2);
        // console.log(${txId}, "hellooooo");
        //   console.log(transaction1, "tx2");
        globalInstructions.push(...swapToTknIns);
        // transactions.push(tx1);
        //   transactions.push(transaction1);
            
        // here tokenPrice
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
          amount: amount, // Either deposit or withdrawal amount
          tokenAddress: coin.address,
        });
        await record.save();
      }
      const collectorPublicKeys = index.collectorDetail.map(
        (collectorDetail) => new PublicKey(collectorDetail.collector)
      );

      
      const { instructions: swapToTknEndIns } = await swapToTknEnd(
        program,
        mintkeypair,
        provider as Provider,
        //   keypair,
        collectorPublicKeys
      );
  
      globalInstructions.push(...swapToTknEndIns);
      // console.log(versionedTransaction3, "tx3");
      // const txId2 = await connection.sendTransaction(versionedTransaction3);
      // console.log(${txId2}, "hellooooo, ha");
      // transactions.push(versionedTransaction3);
  
      // transactions.push(tipTx);
      // console.log(tip2Tx, "tip2")
      // const bundle =  await createJitoBundle(transactions, keypair);
      // console.log(bundle, "bundle")
      // const result = await sendJitoBundle(bundle)
      // const res = await checkBundleStatus(result)
      // console.log(result, "result")
      // console.log(res, "final res")
  
      // await bundleAndSend(keypair,transactions, provider as Provider);
  
      // const batches = await createTransactionBatches(transactions)
      // const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
  
     
      const messageV0 = new web3.TransactionMessage({
        payerKey: keypair.publicKey,
        recentBlockhash: blockhash.blockhash,
        instructions: globalInstructions,
      }).compileToV0Message();
  
      const versionedTransaction = new web3.VersionedTransaction(messageV0);
      versionedTransaction.sign([keypair]);
  
      const txid = await connection.sendTransaction(versionedTransaction, { maxRetries: 2, skipPreflight: true, preflightCommitment: 'processed' });
      // console.log(`
      //   Transaction sent: https://explorer.solana.com/tx/${txid}?cluster=mainnet-beta`
      // );
      console.log(txid)
  
      index.collectorDetail.forEach(async (item) => {
        const adminReward = new AdminReward({
          adminAddress: item.collector,
          type: "buy",
          amount: ((Number(item.weight) / 99) * Number(eventData.deposited))/100,
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
        console.log(eventData, "Event data")
        const blockhash = await connection.getLatestBlockhash();
        console.log(blockhash, "blockHash")

        let indexPublicKey = eventData.index_mint.toString();
        indexPublicKey = `"${indexPublicKey}"`;
        const index = await GroupCoin.findOne({ mintPublickey:indexPublicKey });
        let mintKeySecret = index.mintKeySecret;
        console.log(index)
        mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
        console.log(mintKeySecret)
        const secretKeyUint8Array = new Uint8Array(Buffer.from(mintKeySecret, "base64"))
        const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array); 
        const solPrice = await fetchSolanaUsdPrice();
        for(const coin of index.coins){
            const tokenAddress = new PublicKey(coin.address);
            let amount = ((coin.proportion /100) * Number(eventData.withdrawn)/solPrice) * LAMPORTS_PER_SOL; 
            amount = Math.round(amount);
            console.log(amount, tokenAddress, "tokenAddress");
            const instructions = await swapToSol(program, provider as Provider, mintkeypair, keypair.publicKey, tokenAddress, amount);
            globalInstructions.push(...instructions);
            // transactions.push(txn);

            // here tokenPrice
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

            const record = new Record({
                // user: eventData.userAddress,
                type: "withdraw", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
        };
        const collectorPublicKeys = index.collectorDetail.map(
          (collectorDetail) => new PublicKey(collectorDetail.collector)
        );
        const { instructions: swapToSolEndIns }= await swapToSolEnd(program,mintkeypair,keypair.publicKey, provider as Provider, collectorPublicKeys)
        // transactions.push(txn);
        globalInstructions.push(...swapToSolEndIns);
        

        const messageV0 = new web3.TransactionMessage({
          payerKey: keypair.publicKey,
          recentBlockhash: blockhash.blockhash,
          instructions: globalInstructions,
        }).compileToV0Message();
    
        const versionedTransaction = new web3.VersionedTransaction(messageV0);
        versionedTransaction.sign([keypair]);
    
        const txid = await connection.sendTransaction(versionedTransaction, { maxRetries: 2, skipPreflight: true, preflightCommitment: 'processed' });
        console.log(txid, "txid");
        index.collectorDetail.forEach(async (item) => {
          const adminReward = new AdminReward({
            adminAddress: item.collector,
            type: "sell",
            amount: ((Number(item.weight) / 99) * Number(eventData.withdrawn))/100,
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