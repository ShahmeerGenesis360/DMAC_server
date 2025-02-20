import { Router } from "express";
import categoryController from "../controllers/categoryController";
const category = categoryController();
const categoryRouter = Router();

categoryRouter.post("/create", category.createCategory);
categoryRouter.get("/", category.getAllCategory);

export default categoryRouter;
