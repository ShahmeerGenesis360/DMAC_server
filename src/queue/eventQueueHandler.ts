import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";
import {swapToTknStart, swapToTkn, swapToTknEnd, swapToSol, swapToSolEnd} from "../utils/apiRequest"
import {VersionedTransaction, Keypair, PublicKey, Connection} from '@solana/web3.js'
import {AnchorProvider, web3, Wallet } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import IDL from "../idl/idl.json"
import { Idl, Program, Provider } from "@coral-xyz/anchor";
import {DmacBuyIndexEvent, DmacSellIndexEvent} from "../types/index";
import bs58 from 'bs58';
import {createTransactionBatches, executeBulkSwap} from "../utils/transaction"
import { Record } from "../models/record";
import {AdminReward} from "../models/adminReward"

const { PROGRAM_ID, NETWORK , RPC_URL, getKeypair, PRIVATE_KEY } = config;
const connectionUrl: string = RPC_URL as string // Ensure RPC_URL and NETWORK are defined in your config
const connection = new web3.Connection(connectionUrl, 'confirmed');
const decodedPrivateKey = bs58.decode(PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(decodedPrivateKey);
const wallet = new Wallet(keypair)
// Load the wallet (Keypair from private key)
const provider = new AnchorProvider(connection,wallet, { commitment: "confirmed"}); // Assuming getKeypair() returns an instance of Keypair

// const provider = new Provider(connection, wallet, {
//   commitment: 'confirmed',
//   preflightCommitment: 'processed',
//   skipPreflight: false,
// });
anchor.setProvider(provider);

// Initialize program using IDL
const program = new Program(IDL as Idl, provider as Provider );

async function handleCreateIndexQueue(eventData: any): Promise<void> {
    
}

async function handleBuyIndexQueue(eventData: DmacBuyIndexEvent): Promise<void> {
    try{
        let transactions: VersionedTransaction[] = [];
        const tx0 = await swapToTknStart(program, getKeypair,provider as Provider);           // first transaction
        transactions.push(tx0)
        let indexPublicKey = eventData.index_mint.toString();
        indexPublicKey = `"${indexPublicKey}"`;
        const index = await GroupCoin.findOne({ mintPublickey:indexPublicKey });
        let mintKeySecret = index.mintKeySecret
        mintKeySecret = mintKeySecret.slice(1, mintKeySecret.length - 1);
        const secretKeyUint8Array = new Uint8Array(Buffer.from(mintKeySecret, "base64"))
        const mintkeypair = Keypair.fromSecretKey(secretKeyUint8Array);
        // const privateKeyBuffer = bs58.decode(mintKeySecret);
        // const mintkeypair = Keypair.fromSecretKey(privateKeyBuffer);
        // console.log(eventData.deposited)
        const deposited = parseFloat(eventData.deposited) / 1_000_000_000;
        console.log(deposited,eventData.deposited, "amount" )

        for(const coin of index.coins){
            const tokenAddress = new PublicKey(coin.address);
            const accountInfo = await connection.getAccountInfo(tokenAddress);
            const mintData = accountInfo.data;
            const decimals = mintData[44];
            let amount = ((coin.proportion /100) * Number(eventData.deposited) * Math.pow(10, decimals));
            amount = Math.floor(amount);
            console.log(amount,tokenAddress, "tokenAddress")
            const { tx2 } = await swapToTkn(program, provider as Provider, mintkeypair, tokenAddress, amount);      // Two transaction for each coin
            console.log(tx2, "tx2")
            // transactions.push(tx1);
            transactions.push(tx2);
            const record = new Record({
                // user: eventData.userAddress,
                type: "deposit", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
        };

        const tx3 = await swapToTknEnd(program, mintkeypair, provider as Provider)
        console.log(tx3, "tx3")
        transactions.push(tx3)
        const batches = await createTransactionBatches(transactions)
        const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
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
            const record = new Record({
                user: eventData.userAddress,
                type: "withdraw", // Enum for transaction type
                indexCoin: index._id,
                amount: amount, // Either deposit or withdrawal amount 
                tokenAddress: coin.address,
            })
            await record.save();
            const txn = await swapToSol(program, provider as Provider, mintkeypair, keypair.publicKey, tokenAddress, amount);
            transactions.push(txn);
        };
        const txn = await swapToSolEnd(program,mintkeypair,keypair.publicKey, provider as Provider)
        transactions.push(txn);
        
        const batches = await createTransactionBatches(transactions)
        console.log(provider)
        const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleSellIndexQueue()", error)
        throw error
    }
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue}