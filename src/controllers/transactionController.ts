import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import { Record } from "../models/record";
import moment, { Moment } from "moment";
import { getAllIntervals } from "../utils";
import { AdminReward } from "../models/adminReward";

const transactionController = () => {
  const getTransactions = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;

      // Define allowed types
      type DateRangeKey = "daily" | "weekly" | "monthly";
      const allowedTypes: DateRangeKey[] = ["daily", "weekly", "monthly"];

      if (!type || !allowedTypes.includes(type as DateRangeKey)) {
        return res.status(400).json({ error: "Invalid type parameter" });
      }

      const dateRange: Record<DateRangeKey, number> = {
        daily: 6,
        weekly: 6 * 7,
        monthly: 31 * 7,
      };

      // Get the date range based on type
      const dateRangeKey = type as DateRangeKey;
      const endDate = moment().endOf("day").toDate();
      const startDate = moment()
        .subtract(dateRange[dateRangeKey], "days")
        .startOf("day")
        .toDate();

      const result = await Record.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: 1,
            type: 1,
          },
        },
        {
          $group: {
            _id: "$date",
            totaldeposit: {
              $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] },
            },
            totalwithdrawal: {
              $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            totaldeposit: 1,
            totalwithdrawal: 1,
          },
        },
        { $sort: { date: -1 } },
      ]);

      sendSuccessResponse({
        res,
        data: result,
        message: "Fetched all transactions successfully",
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  const getTransactionMonthly = async (req: Request, res: Response) => {
    console.log("get transaction monthly");

    // Define date range
    const end: Date = moment().utc().toDate();
    const start: Date = moment().utc().subtract(30, "days").toDate();

    try {
      const result = await AdminReward.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Extract YYYY-MM-DD
            type: 1,
            amount: 1,
          },
        },
        {
          $group: {
            _id: { date: "$date", type: "$type" }, // Group by date and type
            totalAmount: { $sum: "$amount" }, // Sum amounts
          },
        },
        { $sort: { "_id.date": -1 } },
        {
          $group: {
            _id: null, // Collect everything in one object
            buyRewards: {
              $push: {
                $cond: [
                  { $eq: ["$_id.type", "buy"] },
                  { date: "$_id.date", totalAmount: "$totalAmount" },
                  "$$REMOVE",
                ],
              },
            },
            sellRewards: {
              $push: {
                $cond: [
                  { $eq: ["$_id.type", "sell"] },
                  { date: "$_id.date", totalAmount: "$totalAmount" },
                  "$$REMOVE",
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            buyRewards: 1,
            sellRewards: 1,
          },
        },
      ]);

      sendSuccessResponse({
        res,
        data: result.length ? result[0] : { buyRewards: [], sellRewards: [] },
        message: "Fetched rewards successfully",
      });
    } catch (err: any) {
      console.error("Error in getTransactionMonthly:", err);
      return res
        .status(500)
        .json({ error: "Server error", details: err.message });
    }
  };
  return {
    getTransactions,
    getTransactionMonthly,
  };
};

export default transactionController;
