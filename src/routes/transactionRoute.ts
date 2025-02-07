import { Router } from "express";
import transactionController from "../controllers/transactionController";
import { decodeTokenFromAdminRequest } from "../utils";
const transaction = transactionController();
const transactionRouter = Router();

transactionRouter.get(
  "/transaction-stats",
  decodeTokenFromAdminRequest,
  transaction.getTransactions
);

transactionRouter.get(
  "/transaction-monthly",
  decodeTokenFromAdminRequest,
  transaction.getTransactionMonthly
);

export default transactionRouter;
