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

export default portfolioRouter;
