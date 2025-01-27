import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";
import {swapToTknStart, swapToTkn, swapToTknEnd, swapToSol, swapToSolEnd} from "../utils/apiRequest"
import {VersionedTransaction, Keypair, PublicKey, LAMPORTS_PER_SOL ,Connection, sendAndConfirmTransaction} from '@solana/web3.js'
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

async function handleBuyIndexQueue(eventData: DmacBuyIndexEvent): Promise<void> {
    try{
        let transactions: VersionedTransaction[] = [];

        let indexPublicKey = eventData.index_mint.toString();
        indexPublicKey = `"${indexPublicKey}"`;
        const index = await GroupCoin.findOne({ mintPublickey:indexPublicKey });
        let mintKeySecret = index.mintKeySecret
        mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
        const secretKeyUint8Array = new Uint8Array(Buffer.from(mintKeySecret, "base64"))
        const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);

        const {versionedTransaction, swapToTokenStartIns} = await swapToTknStart(program, mintkeypair,provider as Provider, keypair);           // first transaction
        transactions.push(versionedTransaction)
        // const txId = await connection.sendTransaction(versionedTransaction);
        // console.log(`${txId}`, "hellooooo");
        // eventData.deposited = "2"
        // const privateKeyBuffer = bs58.decode(mintKeySecret);
        // const mintkeypair = Keypair.fromSecretKey(privateKeyBuffer);
        const deposited = parseFloat(eventData.deposited) / 1_000_000_000;
        console.log(deposited,eventData.deposited, "amount" )
        const solPrice = await fetchSolanaUsdPrice()
        for(const coin of index.coins){
            const tokenAddress = new PublicKey(coin.address);
            const accountInfo = await connection.getAccountInfo(tokenAddress);
            const mintData = accountInfo.data;
            const decimals = mintData[44];
            let amount = ((coin.proportion /100) * Number(eventData.deposited) / solPrice) * LAMPORTS_PER_SOL;
            console.log(amount, "before rounding")
            amount = Math.round(amount);
            console.log(amount,tokenAddress, "tokenAddress")
            const {transaction1, instructions} = await swapToTkn(program, provider as Provider, mintkeypair, tokenAddress, amount, keypair); 
            // const txId = await connection.sendTransaction(tx2);
            // console.log(`${txId}`, "hellooooo");
            console.log(transaction1, "tx2")
            // transactions.push(tx1);
            transactions.push(transaction1);
            const record = new Record({
                // user: eventData.userAddress,
                type: "deposit", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
        };
        const collectorPublicKeys = index.collectorDetail.map(
            (collectorDetail) => new PublicKey(collectorDetail.collector)
        );
        const {versionedTransaction3} = await swapToTknEnd(program, mintkeypair, provider as Provider, keypair, collectorPublicKeys, swapToTokenStartIns, instructions)
        console.log(versionedTransaction3, "tx3")
        // const txId2 = await connection.sendTransaction(versionedTransaction3);
        // console.log(`${txId2}`, "hellooooo, ha");
        transactions.push(versionedTransaction3);

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


        index.collectorDetail.forEach(async(item)=>{
            const adminReward = new AdminReward({
                adminAddress: item.collector,
                amount: Number(item.weight)/99 * Number(eventData.deposited),
                indexCoin: index._id
            })
            await adminReward.save();
        })
        
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleBuyIndexQueue()", error)
        throw error
    }
}

async function handleSellIndexQueue(eventData: DmacSellIndexEvent): Promise<void> {
    try{
        let transactions: VersionedTransaction[] = [];
        
        let indexPublicKey = eventData.index_mint.toString();
        indexPublicKey = `"${indexPublicKey}"`;
        const index = await GroupCoin.findOne({ mintPublickey:indexPublicKey });
        let mintKeySecret = index.mintKeySecret
        mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
        console.log(mintKeySecret)
        const secretKeyUint8Array = new Uint8Array(Buffer.from(mintKeySecret, "base64"))
        const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array); 
       
        for(const coin of index.coins){
            const tokenAddress = new PublicKey(coin.address);
            const amount = ((coin.proportion /100) * Number(eventData.withdrawn)); 
            const txn = await swapToSol(program, provider as Provider, mintkeypair, keypair.publicKey, tokenAddress, amount);
            transactions.push(txn);
            const record = new Record({
                user: eventData.userAddress,
                type: "withdraw", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
        };
        const txn = await swapToSolEnd(program,mintkeypair,keypair.publicKey, provider as Provider)
        transactions.push(txn);
        

        await bundleAndSend(keypair, transactions, provider as Provider)
        
        // const batches = await createTransactionBatches(transactions)
        // console.log(provider)
        // const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleSellIndexQueue()", error)
        throw error
    }
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue}