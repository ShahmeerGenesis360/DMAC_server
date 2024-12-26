import { Request, Response } from "express";
import logger from "../utils/logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CommentService from "../service/commentService";
import ReactionService from "../service/reactionService";
import mongoose from "mongoose";
interface CustomRequest extends Request {
  user?: any;
}
const ReactionController = () => {
  const reactionService = ReactionService();
  const commentService = CommentService();

  const addReactionOnComment = async (req: CustomRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { reaction, indexId } = req.body;
      const { commentId } = req.params;

      if (!req?.user?.id) {
        return sendErrorResponse({
          req,
          res,
          error: "User is not authenticated",
          statusCode: 401,
        });
      }
      if (!commentId || !reaction || !indexId) {
        return sendErrorResponse({
          req,
          res,
          error: "commentId, reaction, and indexId are required",
          statusCode: 400,
        });
      }

      const userId = req.user.id;
      const existingReaction = await reactionService.isUserReacted(
        userId,
        commentId
      );

      if (existingReaction) {
        if (existingReaction.reaction === reaction) {
          // Remove reaction if it's the same
          await reactionService.removeReaction(existingReaction._id);
          if (reaction === "LIKE") {
            await commentService.decrementCommentLike(commentId, session);
          } else {
            await commentService.decrementCommentDislike(commentId, session);
          }
          await session.commitTransaction();
          return sendSuccessResponse({
            res,
            message: "Reaction removed successfully",
          });
        } else {
          // Update reaction if it's different
          await reactionService.updateReaction(existingReaction._id, reaction);
          if (reaction === "LIKE") {
            await commentService.incrementCommentLike(commentId, session);
            await commentService.decrementCommentDislike(commentId, session);
          } else {
            await commentService.incrementCommentDislike(commentId, session);
            await commentService.decrementCommentLike(commentId, session);
          }
          await session.commitTransaction();
          return sendSuccessResponse({
            res,
            message: "Reaction updated successfully",
          });
        }
      } else {
        // Add new reaction
        await reactionService.addReaction(reaction, userId, indexId, commentId);
        if (reaction === "LIKE") {
          await commentService.incrementCommentLike(commentId, session);
        } else {
          await commentService.incrementCommentDislike(commentId, session);
        }
        await session.commitTransaction();
        return sendSuccessResponse({
          res,
          message: "Reaction added successfully",
        });
      }
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Error while adding reaction on comment: ${error.message}`);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    } finally {
      session.endSession();
    }
  };
  return {
    addReactionOnComment,
  };
};
export default ReactionController;
