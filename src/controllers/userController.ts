import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import { User } from "../models/user";
import { createToken } from "../utils";
interface CustomRequest extends Request {
  user?: any;
}
const userController = () => {
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

  return {
    getOrCreateUser,
    updateUser,
  };
};

export default userController;