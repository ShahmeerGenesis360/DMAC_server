import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { GroupCoin } from "../models/groupCoin";
import { Request, Response } from "express";
import logger from "../utils/logger";
import indexService from "../service/indexService";
const indexController = () => {
  const groupIndexService = indexService();
  const createIndex = async (req: Request, res: Response) => {
    logger.info(`indexController create an index`);
    try {
      const { name, coins, imageUrl, visitCount } = req.body;
      // Create a new GroupCoin document
      const groupCoin = new GroupCoin({
        name,
        coins,
        // imageUrl,
        // visitCount,
      });

      // Save to the database
      const savedGroupCoin = await groupCoin.save();
      sendSuccessResponse({
        res,
        data: savedGroupCoin,
        message: "GroupCoin created successfully",
      });
    } catch (error) {
      logger.error(`Error while creating an index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };
  const getAllIndex = async (req: Request, res: Response) => {
    logger.info(`indexController get all index`);
    console.log("getAllIndex");
    try {
      const allIndexs = await GroupCoin.find();
      //   if (allIndexs?.length) {
      //     for (const index of allIndexs) {
      //       // Fetch all coin prices and calculate total
      //       for (const coin of index.coins) {
      //         const coinPrice = await groupIndexService.getCoinCurrentPrice(coin);
      //         console.log("coinPrice", coinPrice);
      //       }
      //     }
      //   }
      sendSuccessResponse({
        res,
        data: allIndexs?.length ? allIndexs : [],
        message: "Fetched all indexs successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching all index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };
  return {
    getAllIndex,
    createIndex,
  };
};

export default indexController;
