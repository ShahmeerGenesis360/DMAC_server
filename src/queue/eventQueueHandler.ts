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
        const indexPublicKey = eventData.index_mint.toString();
        const index = await GroupCoin.findOne({ indexPublicKey });
        const mintKeySecret = index.mintKeySecret
        const privateKeyBuffer = bs58.decode(mintKeySecret);
        const mintkeypair = Keypair.fromSecretKey(privateKeyBuffer);
        
        index.coins.forEach(async(coin)=>{
            const tokenAddress = new PublicKey(coin.address);
            const amount = (coin.proportion * Number(eventData.deposited));     //amount
            const {tx1, tx2 } = await swapToTkn(program, provider as Provider, mintkeypair, tokenAddress, amount);      // Two transaction for each coin
            transactions.push(tx1);
            transactions.push(tx2);
        });

        const tx3 = await swapToTknEnd(program, mintkeypair, provider as Provider)
        transactions.push(tx3)
        const batches = await createTransactionBatches(transactions)
        const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleBuyIndexQueue()", error)
        throw error
    }
}

async function handleSellIndexQueue(eventData: DmacSellIndexEvent): Promise<void> {
    try{
        let transactions: VersionedTransaction[] = [];
        const indexPublicKey =  eventData.index_mint;
        const index = await GroupCoin.findOne({ indexPublicKey });
        const mintKeySecret = index.mintKeySecret
        const privateKeyBuffer = bs58.decode(mintKeySecret);
        const mintkeypair = Keypair.fromSecretKey(privateKeyBuffer);
        index.coins.forEach(async(coin)=>{
            const tokenAddress = new PublicKey(coin.address);
            const amount = (coin.proportion * Number(eventData.withdrawn)); 
            const txn = await swapToSol(program, provider as Provider, mintkeypair, keypair.publicKey, tokenAddress, amount);
            transactions.push(txn);
        });
        const txn = await swapToSolEnd(program,mintkeypair,keypair.publicKey, provider as Provider)
        transactions.push(txn);
        
        const batches = await createTransactionBatches(transactions)
        const results = await executeBulkSwap(batches, getKeypair, provider as Provider)
    }catch(error){
        console.log("Error: EventQueueHandler.ts, handleSellIndexQueue()", error)
        throw error
    }
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue}