import { Router } from "express";
import indexRouter from "./indexRoutes";

const router = Router();

router.use("/index", indexRouter);

export default router;
