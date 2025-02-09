import express from 'express';
import listenForEvents from './events/eventListener';
import Mongo from './config/database';
import http from "http";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT_EVENT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
export { io };

const startServer = async () => {
  try {
    // Establish MongoDB connection
    await Mongo().connect();

    // Start listening for events from Solana
    await listenForEvents().catch(err => console.error('Error starting listener:', err));

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error.message);
    process.exit(1); // Exit the process if there's an error during startup
  }
};

// Graceful shutdown (optional but recommended)
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await Mongo().disconnect(); // Close MongoDB connection
  process.exit();
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await Mongo().disconnect(); // Close MongoDB connection
  process.exit();
});

// Start the server
startServer();
