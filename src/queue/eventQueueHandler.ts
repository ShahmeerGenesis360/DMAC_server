import {config} from "../config/index"
import { GroupCoin } from "../models/groupCoin";

interface EventData {
    [key: string]: any; // Replace with a more specific type if needed
}

async function handleCreateIndexQueue(eventData: EventData): Promise<void> {
    
}

async function handleBuyIndexQueue(eventData: EventData): Promise<void> {
    
}

async function handleSellIndexQueue(eventData: EventData): Promise<void> {
    
}

export {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue}