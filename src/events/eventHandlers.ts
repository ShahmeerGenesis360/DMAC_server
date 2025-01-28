import { addEventToQueue } from '../queue/eventQueue';
import {DmacBuyIndexEvent, DmacSellIndexEvent} from "../types/index"
import {PublicKey} from "@solana/web3.js"
import {BN} from '@coral-xyz/anchor'

// Define the types for the event structure (if you have the specific event structure)
// These are placeholder types, you should adjust them according to the actual event data
interface DmacCreateIndexEvent {
  index_mint: { toBase58(): string };
  tokens: number;
  initial_supply: number;
}

// interface DmacBuyIndexEventType {
//   index_mint: PublicKey;
//   deposited: number;
//   minted: number;
// }

async function handleDmacCreateIndexEvent(event: DmacCreateIndexEvent, slot: number): Promise<void> {
  const { index_mint, tokens, initial_supply } = event;
  console.log("event found")
  console.log(`DmacCreateIndexEvent: Mint=${index_mint.toBase58()}, Tokens=${tokens}, Initial Supply=${initial_supply}`);

  // Add event to the Bull queue
  await addEventToQueue('DmacCreateIndexEvent', event);
}

async function handleDmacBuyIndexEvent(event: any, slot: number, signature: string): Promise<void> {
  console.log("Buy Index Event Processing ...")
  console.log(event)
  const eventData: DmacBuyIndexEvent =  {
    index_mint: (event.indexMint as PublicKey).toString(),
    deposited: (event.deposited as BN).toString(), 
    minted: (event.minted as BN).toString(),
    // userAddress: (event.__context.payer as PublicKey).toString(),
    slot,
    signature,
    timestamp: Date.now(),
  } 

  console.log(`DmacBuyIndexEvent: Mint=${eventData.index_mint}, Deposited=${eventData.deposited}, Minted=${eventData.minted}`);

  // Add event to the Bull queue
  await addEventToQueue('DmacBuyIndexEvent', eventData);
}

async function handleDmacSellIndexEvent(event: any, slot: number, signature: string): Promise<void> {
  console.log("Sell Index Event Processing ...")
  const eventData: DmacSellIndexEvent =  {
    index_mint: (event.indexMint as PublicKey).toString(),
    withdrawn: (event.withdrawn as BN).toString(), 
    burned: (event.burned as BN).toString(),
    // userAddress: (event.__context.payer as PublicKey).toString(),
    slot,
    signature,
    timestamp: Date.now(),
  } 
  console.log(`DmacBuyIndexEvent: Mint=${eventData.index_mint}, Deposited=${eventData.withdrawn}, Minted=${eventData.burned}`);
  await addEventToQueue('DmacSellIndexEvent', eventData);
}

// Export the handlers for use in other parts of the application
export {
  handleDmacCreateIndexEvent,
  handleDmacBuyIndexEvent,
  handleDmacSellIndexEvent
};
