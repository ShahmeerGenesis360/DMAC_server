import { Router } from "express";
import indexRouter from "./indexRoutes";
import userRouter from "./userRoute";
import commentRouter from "./commentRoute";
import portfolioRouter from "./userPortfolioRoutes";
import reactionRouter from "./reactionRoute";
import adminRouter from "./adminRoute";

const router = Router();

router.use("/index", indexRouter);
router.use("/users", userRouter);
router.use("/comment", commentRouter);
router.use("/portfolio", portfolioRouter);
router.use("/reaction", reactionRouter);
router.use("/auth", adminRouter);

export default router;
