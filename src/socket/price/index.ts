import { Server, Socket } from "socket.io";
import { getChartData, getIndexId } from "./helper";
import { RS } from "priceSocket";
import { Record, IRecord } from "../../models/record";
import { Types } from "mongoose";

const priceSocketHandler = (io: Server, socket: Socket) => {
  socket.on(`index2`, (id) => {
    console.log(`User subscribed to 'index2':`, id);

    let firstFetch = true; // Flag to track if it's the first fetch

    // Function to fetch and emit data
    const fetchAndEmitData = async () => {
      try {
        const groupcoin = await getIndexId(id);
        if (groupcoin === undefined) return;

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
        // get 24 ht voulme of index
        // Create start and end of today
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
        const { totalBuy, totalSell , totalVolume} = twenty4hour.reduce(
          (acc, item) => {
            if (item.type === "deposit") {
              acc.totalBuy += 1; // Add amount or default to 0 if undefined
            } else {
              acc.totalSell += 1; // Add amount or default to 0 if undefined
            }
            acc.totalVolume += item.amount
            return acc; // Ensure accumulator is returned
          },
          { totalBuy: 0, totalSell: 0, totalVolume:0 } // Correctly formatted initial accumulator
        );
        console.log("total 24 hr volume ", { totalValue, totalBuy, totalSell,totalVolume });

        const latestResponses = allResponses.flat();

        if (latestResponses?.length) {
          if (firstFetch) {
            socket.emit(`index2:${id}`, {graph: latestResponses, info:{ totalValue, totalBuy, totalSell,totalVolume }}); // Emit the initial 5 candles + latestResponses
            firstFetch = false; // Switch to subsequent updates
          } else {
            socket.emit(`index2:${id}`, {graph: latestResponses, info:{ totalValue, totalBuy, totalSell,totalVolume } }); // Emit the latest candle + average
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
