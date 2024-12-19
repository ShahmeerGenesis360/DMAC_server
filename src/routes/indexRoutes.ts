import { Router } from "express";
import indexController from "../controllers/indexController";

const index = indexController();
const indexRouter = Router();

indexRouter.get("/", index.getAllIndex);

export default indexRouter;
