import { Server, Socket } from "socket.io";
import { getChartData, getIndexId } from "./helper";
import { RS } from "priceSocket";
import { Record, IRecord } from "../../models/record";
import { Types } from "mongoose";
import { getAllIntervals, getOrUpdateFund } from "../../utils";
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
        const { allIntervals, start, end } = await getTimeFrame("1D");
        const viewsArray = [];
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

        const allResponses = await Promise.all(
          groupcoin.coins.map(async (coin) => {
            const responseData: RS[] = await getChartData(coin.address, "1m");

            if (firstFetch) {
              // Fetch the last 5 candles
              return responseData.map((data) => ({
                time: data.t,
                open: data.o,
                close: data.c,
                high: data.h,
                low: data.l,
              }));
            } else {
              // Fetch only the latest candle
              const latest = responseData[responseData.length - 1];
              return [
                {
                  time: latest.t,
                  open: latest.o,
                  close: latest.c,
                  high: latest.h,
                  low: latest.l,
                },
              ];
            }
          })
        );

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

        const latestResponses = allResponses.flat();
        if (latestResponses?.length) {
          if (firstFetch) {
            socket.emit(`index2:${id}`, {
              graph: latestResponses,
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
              },
              chart: viewsArray,
            }); // Emit the initial 5 candles + latestResponses
            firstFetch = false; // Switch to subsequent updates
          } else {
            socket.emit(`index2:${id}`, {
              graph: latestResponses,
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
