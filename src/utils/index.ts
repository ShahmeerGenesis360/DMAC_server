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
  console.log("fund", fund)
  if (!fund) {
    fund = new IndexFund({ indexId: id });
  }
  return fund;
}
