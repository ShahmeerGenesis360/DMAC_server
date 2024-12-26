import { Request, Response } from "express";
import logger from "../utils/logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CommentService from "../service/commentService";
import ReactionService from "../service/reactionService";
interface CustomRequest extends Request {
  user?: any;
}
const ReactionController = () => {
  const reactionService = ReactionService();
  const commentService = CommentService();
  const addReactionOnComment = async (req: CustomRequest, res: Response) => {
    try {
      const { reaction, indexId } = req.body;
      const { commentId } = req.params;
      if (!req?.user?.id) {
        return sendErrorResponse({
          req,
          res,
          error: "User is not authenticated",
          statusCode: 404,
        });
      }
      if (!commentId)
        return sendErrorResponse({
          req,
          res,
          error: "commentId is required",
          statusCode: 404,
        });
      if (!reaction || !indexId) {
        return sendErrorResponse({
          req,
          res,
          error: "reaction and indexId is required",
          statusCode: 404,
        });
      }
      // check if user has already reacted
      const isUserReacted = await reactionService.isUserReacted(
        req.user.id,
        commentId
      );
      if (!isUserReacted) {
        await reactionService.addReaction(
          reaction,
          req.user.id,
          indexId,
          commentId
        );
        if (reaction === "LIKE") {
          // increment like count
          await commentService.incrementCommentLike(commentId);
        } else {
          // increment dislike count
          await commentService.incrementCommentDislike(commentId);
        }
        return sendSuccessResponse({
          res,
          message: "Reaction added successfully",
        });
      } else {
        if (isUserReacted.reaction === reaction) {
          // remove reaction
          await reactionService.removeReaction(isUserReacted._id);
          if (reaction === "LIKE") {
            // decrement like count
            await commentService.decrementCommentLike(commentId);
          } else {
            // decrement dislike count
            await commentService.decrementCommentDislike(commentId);
          }
          return sendSuccessResponse({
            res,
            message: "Reaction removed successfully",
          });

          // decrement react count from comment based on reaction
        } else {
          // update reaction
          await reactionService.updateReaction(isUserReacted._id, reaction);
          if (reaction === "LIKE") {
            // increment like count and decrement dislike count
            await commentService.incrementCommentLike(commentId);
            await commentService.decrementCommentDislike(commentId);
          } else {
            // increment dislike count and decrement like count
            await commentService.incrementCommentDislike(commentId);
            await commentService.decrementCommentLike(commentId);
          }
          return sendSuccessResponse({
            res,
            message: "Reaction updated successfully",
          });
        }
      }
    } catch (error) {
      logger.error(
        `Error while adding reaction on comment ==> `,
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

  return {
    addReactionOnComment,
  };
};
export default ReactionController;
