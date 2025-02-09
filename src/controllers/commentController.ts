import { Request, Response } from "express";
import logger from "../utils/logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CommentService from "../service/commentService";
import { Comment } from "../models/comment";

const CommentController = () => {
  const commentService = CommentService();
  const getCommentsByIndexId = async (req: Request, res: Response) => {
    logger.info(`CommentController get comments by index id`);
    try {
      const { id, type } = req.params;
      const { page, pageSize } = req.query;
      if (!id || !page || !pageSize) {
        return sendErrorResponse({
          req,
          res,
          error: "id, page, pageSize are required",
          statusCode: 404,
        });
      }
      const allComments = await commentService.getChatByIndexId(
        id,
        +page,
        +pageSize,
        type
      );
      sendSuccessResponse({
        res,
        data: allComments,
        message: "Comments fetched successfully",
      });
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
  const incrementImpression = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Update impressions count and last impression timestamp
      await Comment.findByIdAndUpdate(
        id,
        {
          $inc: { impressions: 1 }, // Increase the impressions count
          lastImpressionAt: new Date(),
        },
        { new: true } // Return the updated comment
      );
      sendSuccessResponse({
        res,
        data: { success: true },
        message: "Added impression on the comment",
      });
    } catch (error) {
      logger.error(
        `Error while getting creating impression ==> `,
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
  return { getCommentsByIndexId, incrementImpression };
};

export default CommentController;
