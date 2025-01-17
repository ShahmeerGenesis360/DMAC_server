import { Router } from "express";
import userController from "../controllers/userController";
import { decodeTokenFromAdminRequest, decodeTokenFromRequest } from "../utils";
const user = userController();
const userRouter = Router();

userRouter.post("/", user.getOrCreateUser);
userRouter.patch("/", decodeTokenFromRequest, user.updateUser);
userRouter.get("/", decodeTokenFromRequest, user.getUserbyToken);
userRouter.get("/all", decodeTokenFromAdminRequest, user.getAllUsers);

export default userRouter;
