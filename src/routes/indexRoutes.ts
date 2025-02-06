import { upload } from "../utils/multer";
import { Router } from "express";
// import { multerSingleFileUpload } from "../utils";
import indexController from "../controllers/indexController";
import { decodeTokenFromAdminRequest } from "../utils";

const index = indexController();
const indexRouter = Router();

indexRouter.get("/", index.getAllIndex);
indexRouter.get(
  "/admin",
  decodeTokenFromAdminRequest,
  index.getAllIndexPaginated
);
indexRouter.get("/tvl", index.tvlGraph);
indexRouter.get("/:id", index.getIndexById);
indexRouter.post("/details/:id", index.getIndexGraph);
indexRouter.post("/", upload.single("file"), index.createIndex);
indexRouter.put("/:id", upload.single("file"), index.updateIndex);

export default indexRouter;
