import { Router } from "express";
import ReactionController from "../controllers/reactionController";
import { decodeTokenFromRequest } from "../utils";

const reactionController = ReactionController();
const reactionRouter = Router();

reactionRouter.post(
  "/:commentId",
  decodeTokenFromRequest,
  reactionController.addReactionOnComment
);

export default reactionRouter;
