import { Router } from "express";
import indexRouter from "./indexRoutes";
import userRouter from "./userRoute";
import commentRouter from "./commentRoute";
import portfolioRouter from "./userPortfolioRoutes";
import reactionRouter from "./reactionRoute";
import adminRouter from "./adminRoute";
import transactionRouter from "./transactionRoute";
import categoryRouter from "./categoryRoutes";
import tokenRouter from "./tokenRoute";

const router = Router();

router.use("/index", indexRouter);
router.use("/users", userRouter);
router.use("/comment", commentRouter);
router.use("/portfolio", portfolioRouter);
router.use("/reaction", reactionRouter);
router.use("/auth", adminRouter);
router.use("/transaction", transactionRouter);
router.use("/category", categoryRouter);
router.use("/token", tokenRouter);

export default router;
