import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import { User } from "../models/user";
import { createToken } from "../utils";
import { TopHolder } from "../models/topHolder";
interface CustomRequest extends Request {
  user?: any;
}
const userController = () => {
  const startOfMonth = (date: any) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const startOfWeek = (date: any) => {
    const day = date.getDay();
    return new Date(date.setDate(date.getDate() - day));
  };
  const getOrCreateUser = async (req: Request, res: Response) => {
    logger.info(`userController get or create user`);
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return sendErrorResponse({
          req,
          res,
          error: "wallet address is required",
          statusCode: 404,
        });
      }
      const existingUser = await User.findOne({ walletAddress });
      if (existingUser) {
        logger.info(`User found with wallet address: ${walletAddress}`);
        const token = await createToken(existingUser);
        sendSuccessResponse({
          res,
          data: { user: existingUser, token },
          message: "User fetched successfully",
        });
      } else {
        logger.info(
          `User not found with wallet address: ${walletAddress}, creating new user `
        );
        const newUser = new User({ walletAddress });
        const savedUser = await newUser.save();
        const token = await createToken(savedUser);
        sendSuccessResponse({
          res,
          data: { user: savedUser, token },
          message: "User created successfully",
        });
      }
    } catch (error) {
      logger.error(
        `Error while getting user by wallet address ==> `,
        error.message
      );
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const updateUser = async (req: CustomRequest, res: Response) => {
    try {
      const { username, profileImage, name } = req.body;
      if (!req?.user?.id) {
        sendErrorResponse({
          req,
          res,
          error: "User id is required",
          statusCode: 404,
        });
      }
      // Check if user exists in the database
      const user = await User.findById(req.user.id);
      if (!user) {
        sendErrorResponse({
          req,
          res,
          error: "User not found",
          statusCode: 404,
        });
      } else {
        // Update the user's information if provided
        if (username) user.username = username;
        if (profileImage) user.profileImage = profileImage;
        if (name) user.name = name;

        // Save the updated user to the database
        await user.save();

        // Generate a new token (if required)
        const token = await createToken(user);
        sendSuccessResponse({
          res,
          data: { user, token },
          message: "User updated successfully",
        });
      }
    } catch (error) {
      logger.error(`Error while updating user ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getUserbyToken = async (req: CustomRequest, res: Response) => {
    const { user } = req;
    console.log("user", user.id);
    const existingUser = await User.findById(user.id);
    sendSuccessResponse({
      res,
      data: { user: existingUser },
      message: "User fetched successfully",
    });
  };

  const getUserStats = async (req: CustomRequest, res: Response) => {
    try {
      const { type } = req.query;

      // Find the earliest user creation date
      const firstUser: any = await User.findOne()
        .sort({ createdAt: 1 })
        .select("createdAt");

      if (!firstUser) {
        return res.status(404).json({ message: "No users found" });
      }

      const startDate = new Date(firstUser?.createdAt); // Date of the first user
      const currentDate = new Date(); // Current date

      if (type === "month") {
        // Group data by month and return total user counts for each month
        const monthlyData = await User.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: currentDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 }, // Total users per month
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
            },
          },
        ]);

        // Group the results by month in the format YYYY-MM
        const groupedData: any = {};
        let totalUsers = 0; // Variable to store the total user count
        let latestMonth = ""; // Variable to store the latest month
        let latestMonthCount = 0; // Variable to store the count of the latest month

        monthlyData.forEach((data) => {
          const monthKey = `${data._id.year}-${String(data._id.month).padStart(
            2,
            "0"
          )}`;
          groupedData[monthKey] = data.count; // Store the total count for each month

          totalUsers += data.count; // Accumulate total users

          // Check for the latest month
          if (
            !latestMonth ||
            new Date(`${data._id.year}-${data._id.month}`).getTime() >
              new Date(latestMonth).getTime()
          ) {
            latestMonth = `${data._id.year}-${String(data._id.month).padStart(
              2,
              "0"
            )}`;
            latestMonthCount = data.count; // Store the count of the latest month
          }
        });

        // Return the grouped data with total count per month, total users, latest month, and latest month's count
        res.status(200).json({
          type: "month",
          data: {
            groupedData,
            totalUsers,
            latestMonth,
            latestMonthCount, // Added the latest month's count
          },
        });
      } else if (type === "week") {
        // Group data by week and return weekly user counts
        const weeklyData = await User.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: currentDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                week: { $week: "$createdAt" },
              },
              count: { $sum: 1 }, // Total users per week
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.week": 1,
            },
          },
        ]);

        // Group the results by week in the format YYYY-WW
        const groupedData: any = {};
        let totalUsers = 0; // Variable to store the total user count
        let latestMonth = ""; // Variable to store the latest week
        let latestMonthCount = 0; // Variable to store the count of the latest week

        weeklyData.forEach((data) => {
          const firstDayOfWeek = new Date(
            data._id.year,
            0,
            (data._id.week - 1) * 7 + 1
          );
          const formattedWeek = firstDayOfWeek.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
          });

          groupedData[formattedWeek] = data.count;
          totalUsers += data.count;

          // Check for the latest week
          if (
            !latestMonth ||
            firstDayOfWeek.getTime() > new Date(latestMonth).getTime()
          ) {
            latestMonth = formattedWeek;
            latestMonthCount = data.count;
          }
        });

        // Return the grouped data with total count per week, total users, latest week, and latest week's count
        res.status(200).json({
          type: "week",
          data: {
            groupedData,
            totalUsers,
            latestMonth,
            latestMonthCount,
          },
        });
      } else {
        res.status(400).json({ message: "Invalid type parameter" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  const getAllUsers = async (req: Request, res: Response) => {
    logger.info(`userController get all users`);
    try {
      const { page = 1, limit = 10, search } = req.query;
      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const totalUsers = await User.countDocuments(query);

      sendSuccessResponse({
        res,
        data: {
          users,
          totalUsers,
          totalPages: Math.ceil(totalUsers / Number(limit)),
          currentPage: Number(page),
        },
        message: "Users fetched successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching all users ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getAllTokenTopHolders = async (req: Request, res: Response) => {
    logger.info(`userController get all topHolders`);
    try {
      const { page = 1, limit = 10, search } = req.query;
      const query: any = {};

      if (search) {
        query.$or = [
          { owner: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ];
      }

      const holders = await TopHolder.find(query)
        .sort({ balance: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const totalHolders = await TopHolder.countDocuments(query);

      sendSuccessResponse({
        res,
        data: {
          holders,
          totalHolders,
          totalPages: Math.ceil(totalHolders / Number(limit)),
          currentPage: Number(page),
        },
        message: "Holders fetched successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching all holders ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  return {
    getOrCreateUser,
    updateUser,
    getUserbyToken,
    getAllUsers,
    getUserStats,
    getAllTokenTopHolders,
  };
};

export default userController;
