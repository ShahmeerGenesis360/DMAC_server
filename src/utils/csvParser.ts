import fs from "fs";
import csv from "csv-parser";

export interface CsvRow {
  walletAddress: string;
}

export const parseCsv = async (filePath: string): Promise<CsvRow[]> => {
  const results: CsvRow[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
};
