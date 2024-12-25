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
  return {
    createUserPortfolio,
  };
};

export default PortfolioService;
