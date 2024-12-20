import { Server, Socket } from "socket.io";
import { getChartData, getIndexId } from "./helper";
import { RS } from "priceSocket";

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

        const latestResponses = allResponses.flat();

        if (latestResponses?.length) {

          if (firstFetch) {
            socket.emit(`index2:${id}`, latestResponses); // Emit the initial 5 candles + latestResponses
            firstFetch = false; // Switch to subsequent updates
          } else {
            socket.emit(`index2:${id}`, latestResponses); // Emit the latest candle + average
          }
        } else {
          socket.emit(`index2:${id}`, []);
        }
      } catch (err) {
        console.error("Error fetching or emitting data:", err);
        socket.emit(`index2:${id}`, []);
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
