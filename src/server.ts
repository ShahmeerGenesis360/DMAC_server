import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import { initializeSocket } from "./socket";
import { config } from "./config";
import Mongo from "./config/database";
const app = express();
const server = http.createServer(app);
const PORT = config.port;
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
(async () => {
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  app.use(helmet());
  app.get("/", (req, res) => {
    res.send("SERVER IS RUNNING ");
  });
  // Initialize sockets
  initializeSocket(server);
  server.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
    logger.info(`Server is listening on port: ${PORT}`);
  });
  logger.info("Trying to connect with database");
  await Mongo().connect();

  logger.verbose("🚀 Service started and ready to use");
})();
