import express from 'express';
import { addEventToQueue } from './queue/eventQueue';
import { RebalanceEvent } from './types';

const router = express.Router();

router.post('/rebalance', async (req, res) => {  
    try {
    const { id, coins } = req.body;
    const eventData: RebalanceEvent =  {
        indexId: id,
        coins: coins,
    }
    console.log(eventData, "rebalance eventData")
    const rebalanceResult = {
        status: 'success',
        message: 'Rebalance added to queue',
      };
  
      res.status(201).json(rebalanceResult);
    await addEventToQueue('RebalanceIndex', eventData);
    } catch (error) {
        console.error('Error in rebalance endpoint:', error);
        res.status(500).json({
        status: 'error',
        message: 'Failed to process rebalance request',
        error: error.message
        });
    }
});

export default router;