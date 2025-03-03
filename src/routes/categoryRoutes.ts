import { Router } from "express";
import categoryController from "../controllers/categoryController";
const category = categoryController();
const categoryRouter = Router();

categoryRouter.post("/create", category.createCategory);
categoryRouter.get("/", category.getAllCategory);
categoryRouter.delete("/:id", category.deleteCategory);

export default categoryRouter;
