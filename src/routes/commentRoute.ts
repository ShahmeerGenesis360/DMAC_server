import { Router } from "express";
import CommentController from "../controllers/commentController";
// import indexController from "../controllers/indexController";

const commentController = CommentController();
const commentRouter = Router();

commentRouter.post("/:id/view", commentController.incrementImpression);
commentRouter.get("/:id/:type", commentController.getCommentsByIndexId);

export default commentRouter;
