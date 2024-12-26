import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { GroupCoin } from "../models/groupCoin";
import { Request, Response } from "express";
import logger from "../utils/logger";
import indexService from "../service/indexService";
import {
  calculateAveragePercentage,
  calculatePercentage,
  getChartData,
} from "../socket/price/helper";
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
      const allIndexData = await Promise.all(
        allIndexs.map(async (index) => {
          const coinData = await Promise.all(
            index.coins.map(async (coin) => {
              // Fetch chart data for different intervals (1h, 24h, 7d)
              const [data1h, data24h, data7d] = await Promise.all([
                getChartData(coin.address, "1H", 60),
                getChartData(coin.address, "1D", 1460),
                getChartData(coin.address, "1D", 10080),
              ]);

              console.log(`Data for coin ${coin}:`, {
                data1h,
                data24h,
                data7d,
              });

              // Calculate percentage change for each time frame (1 hour, 24 hours, and 7 days)
              const calculateForTimeFrame = (data: any[]) => {
                if (data.length === 0) return { o: 0, c: 0, percentage: 0 };
                const { o, c } = data[data.length - 1]; // Get the last data point for each timeframe
                return {
                  o,
                  c,
                  percentage: calculatePercentage(o, c),
                };
              };

              // Get the percentage change for each timeframe
              const percentage1h = calculateForTimeFrame(data1h);
              const percentage24h = calculateForTimeFrame(data24h);
              const percentage7d = calculateForTimeFrame(data7d);

              const getLastClosePrice = (data: any[]) => {
                if (data.length === 0) return 0;
                return data[data.length - 1].c; // Close price of the last data point
              };

              const coinPrice = getLastClosePrice(data1h);

              return {
                coinAddress: coin.address,
                percentage1h: percentage1h.percentage,
                percentage24h: percentage24h.percentage,
                percentage7d: percentage7d.percentage,
                coinPrice,
              };
            })
          );

          // Calculate the average percentage for each time frame (1h, 24h, 7d) across all coins in the index
          const averagePercentage1h = calculateAveragePercentage(
            coinData.map((data) => data.percentage1h)
          );
          const averagePercentage24h = calculateAveragePercentage(
            coinData.map((data) => data.percentage24h)
          );
          const averagePercentage7d = calculateAveragePercentage(
            coinData.map((data) => data.percentage7d)
          );

          const price =
            coinData.reduce((sum, data) => sum + data.coinPrice, 0) /
            coinData.length;

          return {
            _id: index._id,
            name: index.name,
            coins: index.coins,
            visitCount: index.visitCount,
            a1H: averagePercentage1h,
            a1D: averagePercentage24h,
            a1W: averagePercentage7d,
            price,
          };
        })
      );

      sendSuccessResponse({
        res,
        data: allIndexs?.length ? allIndexData : [],
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

  const getIndexById = async (req: Request, res: Response) => {
    logger.info(`indexController get index by id`);
    try {
      const { id } = req.params;
      if (!id)
        return sendErrorResponse({
          req,
          res,
          error: "id is required",
          statusCode: 404,
        });
      const index = await GroupCoin.findById(id);
      if (!index) {
        sendErrorResponse({
          req,
          res,
          error: "Index not found",
          statusCode: 404,
        });
        return;
      }
      sendSuccessResponse({
        res,
        data: index,
        message: "Fetched index successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching index by id ==> `, error.message);
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
    getIndexById,
  };
};

export default indexController;
