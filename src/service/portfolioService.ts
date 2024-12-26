import { Types } from "mongoose";
import { UserPortfolio, IUserPortfolio } from "../models/userPortfolio";

const PortfolioService = () => {
  const createUserPortfolio = async (
    userId: string,
    indexId: string,
    amount: Number
  ): Promise<IUserPortfolio> => {
    return UserPortfolio.create({
      userId,
      indexId,
      amount,
    });
  };

  const getUserPortfolios = async (userId: string): Promise<any[]> => {
    const userID = new Types.ObjectId(userId);
    return UserPortfolio.find({
      userId: userID,
    }).populate("indexId");
  };
  return {
    createUserPortfolio,
    getUserPortfolios,
  };
};

export default PortfolioService;
