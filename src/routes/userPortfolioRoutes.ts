import { Router } from "express";
import PortfolioController from "../controllers/portfolioController";
import { decodeTokenFromRequest } from "../utils";

const portfolioController = PortfolioController();
const portfolioRouter = Router();

portfolioRouter.post(
  "/",
  decodeTokenFromRequest,
  portfolioController.addPortfolio
);

portfolioRouter.get(
  "/",
  decodeTokenFromRequest,
  portfolioController.getPortfolioPrice
);

export default portfolioRouter;
