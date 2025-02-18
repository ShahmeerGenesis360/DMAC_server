import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import moment, { Moment } from "moment";
import { GroupCoinHistory } from "../models/groupCoinHistory";
import { Record } from "../models/record";
import { IndexFund } from "../models/indexFund";
import { Types } from "mongoose";

const SECRET_KEY = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_SECRET = "your_secret_key_here"; // Replace with an environment variable in production

export const createToken = async (
  user: Record<string, any>
): Promise<string> => {
  try {
    // Ensure user object contains necessary fields
    if (!user || typeof user !== "object" || !user._id) {
      throw new Error("User object is invalid or missing required fields.");
    }

    const token = await jwt.sign({ id: user._id }, SECRET_KEY);
    return token;
  } catch (error) {
    console.error("Error creating token:", error);
    throw new Error("Failed to create token");
  }
};

interface CustomRequest extends Request {
  user?: any;
}
export const decodeTokenFromRequest = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next(new Error("Authorization token is missing or invalid"));
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer "

  try {
    const decodedUser = jwt.verify(token, SECRET_KEY);
    console.log({ decodedUser });

    if (!decodedUser) {
      return next(new Error("Invalid or expired token"));
    }

    req.user = decodedUser; // Assign decoded user to the request object
    next(); // Pass control to the next middleware
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
};

export const decodeTokenFromAdminRequest = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token is missing or invalid" });
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer "

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);

    if (!decodedUser) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = decodedUser; // Assign decoded user to the request object
    next(); // Pass control to the next middleware
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};


export const getAllIntervals = async (
  start: Moment,
  end: Moment,
  intervals: number
): Promise<Date[]> => {
  const arr: Date[] = [];
  const difference: number = end.diff(start, "days") / intervals;

  arr.push(start.toDate()); // Store actual Date objects
  let prev: Moment = start;

  for (let index = 1; index < intervals - 1; index++) {
    const newDate: Moment = moment(prev).add(difference, "days");
    arr.push(newDate.toDate());
    prev = newDate;
  }

  arr.push(end.toDate());
  return arr;
};

export async function getOrUpdateFund(id: unknown) {
  let fund = await IndexFund.findOne({ indexId: id });
  console.log("fund", fund);
  if (!fund) {
    fund = new IndexFund({ indexId: id });
  }
  return fund;
}

// export const groupDataByMinute = (tickData: any[]) => {
//   const groupedData = new Map();

//   tickData.forEach(({ createdAt: time, price }) => {
//     const date = new Date(time);
//     const key = `${date.getUTCFullYear()}-${
//       date.getUTCMonth() + 1
//     }-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}`; // Group by year-month-day hour:minute

//     if (!groupedData.has(key)) {
//       groupedData.set(key, {
//         open: price,
//         high: price,
//         low: price,
//         close: price,
//       });
//     } else {
//       const candle = groupedData.get(key);
//       candle.high = Math.max(candle.high, price);
//       candle.low = Math.min(candle.low, price);
//       candle.close = price;
//       groupedData.set(key, candle);
//     }
//   });

//   return Array.from(groupedData.entries()).map(
//     ([key, { open, high, low, close }]) => {
//       const [datePart, timePart] = key.split(" ");
//       const [year, month, day] = datePart.split("-").map(Number);
//       const [hour, minute] = timePart.split(":").map(Number);

//       return {
//         time: { year, month, day, hour, minute },
//         open,
//         high,
//         low,
//         close,
//       };
//     }
//   );
// };
export const groupDataByDay = (tickData: any[]) => {
  const groupedData = new Map();
  if (!tickData.length) {
    return [
      {
        time: { year: 0, month: 0, day: 0 },
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      },
    ];
  }

  tickData.forEach(({ createdAt, price }) => {
    const date = new Date(createdAt);
    const key = `${date.getUTCFullYear()}-${
      date.getUTCMonth() + 1
    }-${date.getUTCDate()}`; // Format: YYYY-MM-DD

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } else {
      const candle = groupedData.get(key);
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price; // Last recorded price of the day
      groupedData.set(key, candle);
    }
  });

  return Array.from(groupedData.entries()).map(
    ([key, { open, high, low, close }]) => {
      const [year, month, day] = key.split("-").map(Number);

      return {
        time: { year, month, day }, // Lightweight Charts format
        open,
        high,
        low,
        close,
      };
    }
  );
};

export function processHistoricalData(history: any[], timeRanges: any) {
  return history.reduce(
    (acc, item) => {
      const itemDate = moment(item.createdAt);
      if (itemDate.isBetween(timeRanges.oneHourAgo, timeRanges.now)) {
        acc.hourData.push(item);
      }
      if (itemDate.format("YYYY-MM-DD") === timeRanges.today) {
        acc.dayData.push(item);
      }
      if (itemDate.isBetween(timeRanges.sevenDaysAgo, timeRanges.now)) {
        acc.sevenDayData.push(item);
      }
      return acc;
    },
    { hourData: [], dayData: [], sevenDayData: [] }
  );
}

export function calculatePercentages(
  hourData: any[],
  dayData: any[],
  sevenDayData: any[]
) {
  return {
    a1H:
      hourData.length > 1
        ? calculatePercentageChange(
            hourData[0].price,
            hourData[hourData.length - 1].price
          )
        : 0,
    a1D:
      dayData.length > 1
        ? calculatePercentageChange(
            dayData[0].price,
            dayData[dayData.length - 1].price
          )
        : 0,
    a1W:
      sevenDayData.length > 1
        ? calculatePercentageChange(
            sevenDayData[0].price,
            sevenDayData[sevenDayData.length - 1].price
          )
        : 0,
  };
}

export async function getUniqueHolders(indexId: any) {
  return Record.aggregate([
    { $match: { indexCoin: new Types.ObjectId(indexId) } },
    {
      $group: {
        _id: "$tokenAddress",
        totalDeposit: { $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] } },
        totalWithdrawal: { $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] } }
      }
    },
    {
      $addFields: {
        netBalance: { $subtract: ["$totalDeposit", "$totalWithdrawal"] }
      }
    },
    {
      $match: {
        netBalance: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        holders: { $sum: 1 }
      }
    }
  ]);
}

export function process24HourMetrics(records: any[]) {
  return records.reduce(
    (acc, item) => {
      if (item.type === "deposit") {
        acc.totalBuy += 1;
      } else {
        acc.totalSell += 1;
      }
      acc.totalVolume += item.amount;
      acc.totalValue += item.amount;
      return acc;
    },
    { totalBuy: 0, totalSell: 0, totalVolume: 0, totalValue: 0 }
  );
}

export async function processGraphData(
  indexId: Types.ObjectId,
  intervals: Date[],
  now: Moment
) {
  return Promise.all(
    intervals.map(async (interval, index) => {
      const results = await GroupCoinHistory.find({
        indexId,
        createdAt: {
          $gt: interval,
          $lt: intervals[index + 1] || now.toDate(),
        },
      });
      return {
        ...groupDataByDay(results)?.[0],
        time: interval,
      };
    })
  );
}

export const calculatePercentageChange = (
  previousPrice: number,
  currentPrice: number
): number => {
  if (previousPrice === 0) return 0; // Avoid division by zero
  const change = ((currentPrice - previousPrice) / previousPrice) * 100;
  return parseFloat(change.toFixed(2)); // Round to 2 decimal places
};

export const getGroupByAndStartDate = (interval: string) => {
  let startDate = new Date();
  let groupBy = null;

  switch (interval) {
    case "1D":
      startDate.setHours(startDate.getHours() - 24);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        halfHour: { $floor: { $divide: [{ $minute: "$createdAt" }, 30] } },
        hour: { $hour: "$createdAt" },
      };
      break;
    case "1W":
      startDate.setDate(startDate.getDate() - 7);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        halfHour: { $floor: { $divide: [{ $minute: "$createdAt" }, 30] } },
        hour: { $hour: "$createdAt" },
      };
      break;
    case "1M":
      startDate.setMonth(startDate.getMonth() - 1);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        halfDay: {
          $cond: [{ $lt: [{ $hour: "$createdAt" }, 12] }, "AM", "PM"],
        },
      };
      break;
    case "3M":
      startDate.setMonth(startDate.getMonth() - 3);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "1y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        halfMonth: {
          $cond: [
            { $lt: [{ $dayOfMonth: "$createdAt" }, 15] },
            "Start",
            "End",
          ],
        },
      };
      break;
    case "All":
      startDate = new Date(0);
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    default:
      throw new Error("Invalid interval");
  }
  return { startDate, groupBy };
};
