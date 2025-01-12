import {config} from "../config/index"
import Bull, { Job } from 'bull';
import {handleBuyIndexQueue, handleCreateIndexQueue, handleSellIndexQueue} from './eventQueueHandler'


// Define types for the job data
interface EventData {
  [key: string]: any; // Replace with a more specific type if needed
}

interface JobData {
  eventName: string;
  eventData: EventData;
}
const { redisHost, redisPort , redisPassword, redisDb } = config;

// Create a new Bull queue

const redisConfig =  {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
};

const eventQueue = new Bull<JobData>('eventQueue', {
  redis: redisConfig
});

eventQueue.process(async (job: Job<JobData>) => {
  const { eventName, eventData } = job.data;

  try {
    console.log(`Processing job: ${eventName}`);

    // Conditional logic to handle different events
    switch (eventName) {
      case 'DmacCreateIndexEvent':
        await handleCreateIndexEvent(eventData);
        break;

      case 'DmacBuyIndexEvent':
        await handleBuyIndexEvent(eventData);
        break;

      default:
        console.log(`Unknown event: ${eventName}`);
    }

    console.log(`${eventName} saved to DB!`);
  } catch (err) {
    console.error('Error processing job:', err);
  }
});

// Individual handlers for different event types
async function handleCreateIndexEvent(eventData: EventData): Promise<void> {
  console.log("Handling Create Index Event...");
  await handleCreateIndexQueue(eventData);
  // Custom logic for the DmacCreateIndexEvent
}

async function handleBuyIndexEvent(eventData: EventData): Promise<void> {
  console.log("Handling Buy Index Event...");
  await handleBuyIndexQueue(eventData)
  // Custom logic for the DmacBuyIndexEvent
}

// Add job to the queue (this function will be called when the event is received)
async function addEventToQueue(eventName: string, eventData: EventData): Promise<void> {
  await eventQueue.add({
    eventName,
    eventData,
  });

  console.log(`${eventName} added to the queue!`);
}

export {
  eventQueue,
  addEventToQueue,
};
// Process the job in the queue
