import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import PortfolioService from "../service/portfolioService";
import indexService from "../service/indexService";
interface CustomRequest extends Request {
  user?: any;
}
const PortfolioController = () => {
  const ind = indexService();
  const portfolioService = PortfolioService();
  const addPortfolio = async (req: CustomRequest, res: Response) => {
    try {
      if (!req?.user?.id) {
        sendErrorResponse({
          req,
          res,
          error: "User is not authenticated",
          statusCode: 404,
        });
      }
      const { indexId, amount } = req.body;
      if (!indexId || !amount) {
        sendErrorResponse({
          req,
          res,
          error: "indexId and amount is required",
          statusCode: 404,
        });
      }
      const newPortfolio = await portfolioService.createUserPortfolio(
        req?.user?.id,
        indexId,
        amount
      );
      sendSuccessResponse({
        res,
        data: newPortfolio.toObject(),
        message: "Portfolio added successfully",
      });
      logger.info(`portfolioController add portfolio`);
    } catch (error) {
      logger.error(`Error while adding portfolio ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getPortfolioPrice = async (req: CustomRequest, res: Response) => {
    try {
      if (!req?.user?.id) {
        return sendErrorResponse({
          req,
          res,
          error: "User is not authenticated",
          statusCode: 404,
        });
      }

      let portfolios = await portfolioService.getUserPortfolios(req.user.id);
      const responsePortfolios = portfolios.map((portfolio) => ({
        ...portfolio.toObject(), // Convert Mongoose document to plain object
        price: 0,
      }));
      // Calculate portfolio price for each portfolio
      for (const portfolio of responsePortfolios) {
        let totalPrice = 0;

        const allCoins = portfolio?.indexId?.coins || [];

        for (const coin of allCoins) {
          const coinPrice = await ind.getCoinCurrentPrice(coin.address);
          totalPrice += coinPrice;
        }

        portfolio["price"] = totalPrice / allCoins.length; // Average price
      }

      return sendSuccessResponse({
        res,
        data: responsePortfolios,
        message: "Portfolios fetched successfully",
      });
    } catch (error) {
      logger.error(`Error while getting portfolio price ==> `, error.message);
      return sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };
  return {
    addPortfolio,
    getPortfolioPrice,
  };
};
export default PortfolioController;
