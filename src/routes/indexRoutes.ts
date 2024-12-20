import { Router } from "express";
import indexController from "../controllers/indexController";

const index = indexController();
const indexRouter = Router();

indexRouter.get("/", index.getAllIndex);
indexRouter.get("/:id", index.getIndexById);
indexRouter.post("/", index.createIndex);

export default indexRouter;
