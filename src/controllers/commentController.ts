import { Request, Response } from "express";
import logger from "../utils/logger";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CommentService from "../service/commentService";

const CommentController = () => {
  const commentService = CommentService();
  const getCommentsByIndexId = async (req: Request, res: Response) => {
    logger.info(`CommentController get comments by index id`);
    try {
      const { id } = req.params;
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
        +pageSize
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
  return { getCommentsByIndexId };
};

export default CommentController;
