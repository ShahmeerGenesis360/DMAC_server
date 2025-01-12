import { addEventToQueue } from '../queue/eventQueue';

// Define the types for the event structure (if you have the specific event structure)
// These are placeholder types, you should adjust them according to the actual event data
interface DmacCreateIndexEvent {
  index_mint: { toBase58(): string };
  tokens: number;
  initial_supply: number;
}

interface DmacBuyIndexEvent {
  index_mint: { toBase58(): string };
  deposited: number;
  minted: number;
}

async function handleDmacCreateIndexEvent(event: DmacCreateIndexEvent, slot: number): Promise<void> {
  const { index_mint, tokens, initial_supply } = event;
  console.log(`DmacCreateIndexEvent: Mint=${index_mint.toBase58()}, Tokens=${tokens}, Initial Supply=${initial_supply}`);

  // Add event to the Bull queue
  await addEventToQueue('DmacCreateIndexEvent', event);
}

async function handleDmacBuyIndexEvent(event: DmacBuyIndexEvent, slot: number): Promise<void> {
  const { index_mint, deposited, minted } = event;
  console.log(`DmacBuyIndexEvent: Mint=${index_mint.toBase58()}, Deposited=${deposited}, Minted=${minted}`);

  // Add event to the Bull queue
  await addEventToQueue('DmacBuyIndexEvent', event);
}

// Export the handlers for use in other parts of the application
export {
  handleDmacCreateIndexEvent,
  handleDmacBuyIndexEvent,
};
