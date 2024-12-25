import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import PortfolioService from "../service/portfolioService";
interface CustomRequest extends Request {
  user?: any;
}
const PortfolioController = () => {
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
  return {
    addPortfolio,
  };
};
export default PortfolioController;
