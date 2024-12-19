import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { GroupCoin } from "../models/groupCoin";
import { Request, Response } from "express";
import logger from "../utils/logger";
const indexController = () => {
  const getAllIndex = async (req: Request, res: Response) => {
    logger.info(`indexController get all index`);
    console.log("getAllIndex");
    try {
      const allIndexs = await GroupCoin.find();
      sendSuccessResponse({
        res,
        data: allIndexs?.length ? allIndexs : [],
        message: "Fetched all indexs successfully",
      });
    } catch (error) {
      logger.error(`Error while adding user ==> `, error.message);
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
  };
};

export default indexController;
