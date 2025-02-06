import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import moment, { Moment } from "moment";
import { IndexFund } from "../models/indexFund";

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
): void => {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next(new Error("Authorization token is missing or invalid"));
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer "

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);
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

export const getAllIntervals = async (
  start: Moment,
  end: Moment,
  intervals: number
): Promise<string[]> => {
  const arr: string[] = [];
  const difference: number = end.diff(start, "days") / intervals;

  arr.push(moment(start).format("MMM DD, YYYY"));
  let prev: Moment = start;

  for (let index = 1; index < intervals - 1; index++) {
    const newDate: Moment = moment(prev).add(difference, "days");
    const formattedDate: string = newDate.format("MMM DD, YYYY");
    arr.push(formattedDate);
    prev = newDate;
  }

  arr.push(moment(end).format("MMM DD, YYYY"));
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
