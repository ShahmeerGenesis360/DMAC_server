import { config } from '../config/index'; // assuming config.ts is in the correct directory
import { handleDmacCreateIndexEvent, handleDmacBuyIndexEvent, handleDmacSellIndexEvent } from './eventHandlers';
import * as anchor from '@project-serum/anchor';
import IDL from "../idl/idl.json";
import {VersionedTransaction, Keypair, PublicKey, Connection} from '@solana/web3.js'
import {AnchorProvider, web3, Wallet } from '@project-serum/anchor';
import { Idl, Program, Provider } from "@coral-xyz/anchor";
import bs58 from 'bs58';

const { PROGRAM_ID, NETWORK , RPC_URL, getKeypair, PRIVATE_KEY } = config;
const connectionUrl: string = RPC_URL as string // Ensure RPC_URL and NETWORK are defined in your config
const connection = new web3.Connection(connectionUrl, 'confirmed');
const decodedPrivateKey = bs58.decode(PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(decodedPrivateKey);
const wallet = new Wallet(keypair)
// Load the wallet (Keypair from private key)
const provider = new AnchorProvider(connection,wallet, { commitment: "confirmed"}); // Assuming getKeypair() returns an instance of Keypair


anchor.setProvider(provider);

// Initialize program using IDL
const program = new Program(IDL as Idl ,provider as Provider );



// Listen for events
async function listenForEvents(): Promise<void> {
  console.log('Listening for events...');

  // Listen to events from the program
  // program.addEventListener('dmacCreateIndexEvent', handleDmacCreateIndexEvent);
  // program.addEventListener('DmacBuyIndexEvent', handleDmacBuyIndexEvent);
  program.addEventListener('dmacBuyIndexEvent', handleDmacBuyIndexEvent);
  program.addEventListener('dmacSellIndexEvent', handleDmacSellIndexEvent);
  // Add more event listeners as needed
}

export default listenForEvents;
