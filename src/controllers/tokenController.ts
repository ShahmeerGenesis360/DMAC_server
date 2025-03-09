import { Request, Response } from "express";
import { parseCsv } from "../utils/csvParser";
import fs from "fs";
import { Token } from "../models/token";
const TokenController = () => {
  const addToken = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a file" });
      }

      const filePath = req.file.path;

      // Use try-finally to ensure file cleanup regardless of outcome
      try {
        const csvRows = await parseCsv(filePath);

        if (!csvRows?.length) {
          return res.status(400).json({ message: "No data found in file" });
        }

        const firstRow = csvRows[0];
        const requiredColumns = ["label", "value", "icon"];
        const hasRequiredColumns = requiredColumns.every(
          (column) => column in firstRow
        );

        if (!hasRequiredColumns) {
          return res.status(400).json({
            message: "label, icon and value are the required columns",
          });
        }

        // Use Promise.all to perform operations concurrently
        await Promise.all([Token.deleteMany({}), Token.insertMany(csvRows)]);

        return res.status(200).json({ message: "Token added successfully" });
      } finally {
        // Always clean up the file regardless of success or failure
        fs.promises.unlink(filePath).catch((err) => {
          console.error("Error deleting file:", err);
        });
      }
    } catch (error) {
      console.error("Error adding token:", error);
      return res.status(500).json({ message: "Error adding token", error });
    }
  };

  const getToken = async (req: Request, res: Response) => {
    try {
      const tokens = await Token.find({});
      res.status(200).json({ tokens });
    } catch (error) {
      res.status(500).json({ message: "Error getting token", error });
    }
  };
  return {
    addToken,
    getToken,
  };
};

export default TokenController;
