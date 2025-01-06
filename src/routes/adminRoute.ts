import { Router } from "express";
import adminController from "../controllers/adminController";
const admin = adminController();
const adminRouter = Router();

adminRouter.post("/signup", admin.createAdmin);
adminRouter.post("/login", admin.getAdmin);

export default adminRouter;
