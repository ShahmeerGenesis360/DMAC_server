import { Router } from "express";
import { upload } from "../utils/multer";
import TokenController from "../controllers/tokenController";

const tokenRouter = Router();
const tokenController = TokenController();

tokenRouter.get("/", tokenController.getToken);
tokenRouter.post("/addToken", upload.single("file"), tokenController.addToken);

export default tokenRouter;
