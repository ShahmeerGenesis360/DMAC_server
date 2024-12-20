import { Router } from "express";
import indexRouter from "./indexRoutes";
import userRouter from "./userRoute";

const router = Router();

router.use("/index", indexRouter);
router.use("/users", userRouter);

export default router;
