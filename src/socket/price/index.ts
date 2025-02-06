import { Server, Socket } from "socket.io";
import { getChartData, getIndexId } from "./helper";
import { RS } from "priceSocket";
import { Record, IRecord } from "../../models/record";
import { Types } from "mongoose";
import { getAllIntervals, getOrUpdateFund, groupDataByDay } from "../../utils";
import moment, { Moment } from "moment";
import { GroupCoinHistory } from "../../models/groupCoinHistory";

const getTimeFrame = async (time: "1D" | "1W" | "1M" | "3M") => {
  const end: Moment = moment();
  let start: Moment;
  let allIntervals: Date[];

  switch (time) {
    case "1D":
      start = moment(end).subtract(30, "days");
      allIntervals = await getAllIntervals(start, end, 31);
      return { start, end, allIntervals };

    case "1W":
      start = moment(end).subtract(35, "days");
      allIntervals = await getAllIntervals(start, end, 5);
      return { start, end, allIntervals };

    case "1M":
      start = moment(end).subtract(6 * 30, "days");
      allIntervals = await getAllIntervals(start, end, 6);
      return { start, end, allIntervals };

    case "3M":
      start = moment(end).subtract(4 * 90, "days");
      allIntervals = await getAllIntervals(start, end, 6);
      return { start, end, allIntervals };

    default:
      start = moment(end).subtract(30, "days");
      allIntervals = await getAllIntervals(start, end, 31);
      return { start, end, allIntervals };
  }
};

const priceSocketHandler = (io: Server, socket: Socket) => {
  socket.on(`index2`, (id) => {
    console.log(`User subscribed to 'index2':`, id);
    let firstFetch = true; // Flag to track if it's the first fetch

    // Function to fetch and emit data
    const fetchAndEmitData = async () => {
      try {
        const groupcoin = await getIndexId(id);
        if (groupcoin === undefined) return;
        const now = moment();
        const starts: Moment = moment(now).subtract(6, "days");
        const allGraphIntervals: string[] = await getAllIntervals(
          starts,
          now,
          7
        );
        const viewsArray = [];
        const graphArray = [];
        for (let counter = 0; counter < allGraphIntervals.length; counter++) {
          const results = await GroupCoinHistory.find({
            indexId: id,
            createdAt: {
              $gt: allGraphIntervals[counter],
              $lt: allGraphIntervals[counter + 1] || now,
            },
          });

          graphArray.push({
            ...groupDataByDay(results)?.[0],
            time: allGraphIntervals[counter],
          });
        }
        const { allIntervals, start, end } = await getTimeFrame("1D");
        for (let index = 0; index < allIntervals.length; index++) {
          const results = await GroupCoinHistory.find({
            indexId: id,
            createdAt: {
              $gt: allIntervals[index],
              $lt: allIntervals[index + 1] || end,
            },
          });
          console.log(results, "results");

          // Use reduce to calculate the total amount for the interval
          const totalAmount = results.reduce(
            (acc: number, item: any) => acc + (parseFloat(item.price) || 0), // Add amount or 0 to handle missing fields
            0
          );
          const averageAmount =
            results.length > 0 ? results[results.length - 1].price : 0;

          viewsArray.push({
            startDate: allIntervals[index],
            totalAmount: averageAmount,
          });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1); // Start of the next day

        console.log("today ==> ", today); // Debugging
        console.log("tomorrow ==> ", tomorrow); // Debugging
        const twenty4hour = await Record.find({
          indexCoin: new Types.ObjectId(id),
          // createdAt: {
          //   $gte: today, // Greater than or equal to today
          //   $lt: tomorrow, // Less than tomorrow
          // },
        });
        console.log("data on check ", twenty4hour?.length);
        const totalValue = twenty4hour?.reduce(
          (acc: number, item: IRecord) => acc + item.amount,
          0
        );
        const uniqueHolders = await Record.aggregate([
          {
            $match: {
              indexCoin: id, // Filter for specific indexCoin
            },
          },
          {
            $group: {
              _id: "$tokenAddress", // Group by wallet address
              indexCoin: { $first: "$indexCoin" }, // Preserve indexCoin
              totalDeposit: {
                $sum: {
                  $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0],
                },
              },
              totalWithdrawal: {
                $sum: {
                  $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0],
                },
              },
            },
          },
          {
            $addFields: {
              netBalance: {
                $subtract: ["$totalDeposit", "$totalWithdrawal"],
              }, // Deposit - Withdrawal
            },
          },
          {
            $match: {
              netBalance: { $gt: 0 }, // Sirf jo abhi bhi hold kar rahe hain
            },
          },
          {
            $group: {
              _id: "$indexCoin", // Group by indexCoin to get unique count per index
              holders: { $sum: 1 }, // Count unique holders
            },
          },
        ]);

        // Use reduce to calculate the total amount for the interval
        const { totalBuy, totalSell, totalVolume } = twenty4hour.reduce(
          (acc, item) => {
            if (item.type === "deposit") {
              acc.totalBuy += 1; // Add amount or default to 0 if undefined
            } else {
              acc.totalSell += 1; // Add amount or default to 0 if undefined
            }
            acc.totalVolume += item.amount;
            return acc; // Ensure accumulator is returned
          },
          { totalBuy: 0, totalSell: 0, totalVolume: 0 } // Correctly formatted initial accumulator
        );
        console.log("total 24 hr volume ", {
          totalValue,
          totalBuy,
          totalSell,
          totalVolume,
        });
        const fund = await getOrUpdateFund(id);

        // const latestResponses = allResponses.flat();
        if (graphArray?.length) {
          if (firstFetch) {
            socket.emit(`index2:${id}`, {
              graph: graphArray,
              info: {
                id,
                totalValue,
                totalBuy,
                totalSell,
                totalVolume,
                price:
                  fund.totalSupply === 0
                    ? 0
                    : fund.indexWorth / fund.totalSupply,
                totalSupply: fund.totalSupply,
                indexWorth: fund.indexWorth,
                totalHolder: uniqueHolders[0]?.holders || 0,
              },
              chart: viewsArray,
            }); // Emit the initial 5 candles + latestResponses
            firstFetch = false; // Switch to subsequent updates
          } else {
            socket.emit(`index2:${id}`, {
              graph: graphArray,
              info: {
                id,
                totalValue,
                totalBuy,
                totalSell,
                totalVolume,
                price:
                  fund.totalSupply === 0
                    ? 0
                    : fund.indexWorth / fund.totalSupply,
                totalSupply: fund.totalSupply,
                indexWorth: fund.indexWorth,
                totalHolder: uniqueHolders[0]?.holders || 0,
              },
              chart: viewsArray,
            }); // Emit the latest candle + average
          }
        } else {
          socket.emit(`index2:${id}`, []);
        }
      } catch (err) {
        console.error("Error fetching or emitting data:", err);
        // socket.emit(`index2:${id}`, []);
      }
    };

    // Emit data immediately for the first time
    fetchAndEmitData();

    // Set an interval to emit data every minute
    const interval = setInterval(fetchAndEmitData, 60000);

    // Clear the interval on disconnect
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      clearInterval(interval);
    });
  });
};

export { priceSocketHandler };
