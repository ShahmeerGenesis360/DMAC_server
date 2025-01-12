import express from 'express';
import listenForEvents from './events/eventListener';

const app = express();
const PORT = process.env.PORT || 3000;

// Start listening for events from Solana


// Define a simple route
listenForEvents().catch(err => console.error('Error starting listener:', err));
// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
