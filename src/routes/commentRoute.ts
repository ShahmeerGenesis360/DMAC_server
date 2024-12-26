import { Router } from "express";
import CommentController from "../controllers/commentController";
// import indexController from "../controllers/indexController";

const commentController = CommentController();
const commentRouter = Router();

commentRouter.get("/:id", commentController.getCommentsByIndexId);

export default commentRouter;
