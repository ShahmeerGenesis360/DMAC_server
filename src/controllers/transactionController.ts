import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import { Record } from "../models/record";
import moment, { Moment } from "moment";
import { getAllIntervals } from "../utils";
import { AdminReward } from "../models/adminReward";

const transactionController = () => {
  const getTransactions = async (req: Request, res: Response) => {
    const { type } = req.query;

    // Validate the 'type' query parameter with proper type assertion and checking
    if (!["daily", "weekly", "monthly"].includes(type as string)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    // Define a type for allowed types
    type DateRangeKey = "daily" | "weekly" | "monthly";

    // Map the string keys to their respective date ranges
    const dateRange: Record<DateRangeKey, number> = {
      daily: 6,
      weekly: 6 * 7,
      monthly: 31 * 7,
    };

    // Ensure 'type' is treated as a valid key from the `dateRange` object
    const dateRangeKey = type as DateRangeKey;

    // Set the end date to today's date
    const end: Moment = moment();

    // Calculate the start date by subtracting the specified range from the end date
    console.log(">> :", dateRange[dateRangeKey]);
    const start: Moment = moment(end).subtract(dateRange[dateRangeKey], "days");

    // Assume getAllIntervals is defined elsewhere with proper typing
    const allIntervals: Date[] = await getAllIntervals(start, end, 7);

    // Log or return the intervals as required
    console.log("All Intervals length:", allIntervals?.length);
    console.log("All Intervals:", allIntervals);
    try {
      const viewsArray = [];
      for (let index = 0; index < allIntervals.length; index++) {
        const results = await Record.find({
          createdAt: {
            $gt: allIntervals[index],
            $lt: allIntervals[index + 1] || end,
          },
        });

        // Use reduce to calculate the total amount for the interval
        const { totaldeposit, totalwithdrawl } = results.reduce(
          (acc, item) => {
            if (item.type === "deposit") {
              acc.totaldeposit += item.amount || 0; // Add amount or default to 0 if undefined
            } else {
              acc.totalwithdrawl += item.amount || 0; // Add amount or default to 0 if undefined
            }
            return acc; // Ensure accumulator is returned
          },
          { totaldeposit: 0, totalwithdrawl: 0 } // Correctly formatted initial accumulator
        );

        viewsArray.push({
          startDate: allIntervals[index],
          totaldeposit,
          totalwithdrawl,
        });
      }
      res.json({ data: viewsArray });
    } catch (err) {
      res.status(500).json({ error: "Server error", details: err.message });
    }
  };

  const getTransactionMonthly = async (req: Request, res: Response) => {
    // Set the end date to today's date
    const end: Moment = moment();

    // Calculate the start date by subtracting the specified range from the end date
    const start: Moment = moment(end).subtract(30, "days");

    // Assume getAllIntervals is defined elsewhere with proper typing
    const allIntervals: Date[] = await getAllIntervals(start, end, 31);

    // Log or return the intervals as required
    console.log("All Intervals length:", allIntervals?.length);
    console.log("All Intervals:", allIntervals);
    try {
      const viewsArray = [];
      for (let index = 0; index < allIntervals.length; index++) {
        const results = await AdminReward.find({
          createdAt: {
            $gt: allIntervals[index],
            $lt: allIntervals[index + 1] || end,
          },
        });

        // Use reduce to calculate the total amount for the interval
        const totalAmount = results.reduce(
          (acc: number, item: any) => acc + (item.amount || 0), // Add amount or 0 to handle missing fields
          0
        );

        viewsArray.push({
          startDate: allIntervals[index],
          totalAmount,
        });
      }
      res.json({ data: viewsArray });
    } catch (err) {
      res.status(500).json({ error: "Server error", details: err.message });
    }
  };

  return {
    getTransactions,
    getTransactionMonthly,
  };
};

export default transactionController;
