import { Server, Socket } from "socket.io";
import { getChartData } from "./helper";
import { RS } from "priceSocket";
const priceSocketHandler = (io: Server, socket: Socket) => {
  //   socket.on("subscribeToPrice", (data: any) => {});

  // Listen for the 'index' event from the frontend
  socket.on("index", (data) => {
    console.log(`User subscribed to 'index':`, data);

    // Simulate returning data every 3 seconds
    const interval = setInterval(async () => {
      const responseData: RS[] = await getChartData();
      const rs = responseData.reduce((acc, data: RS) => {
        acc.push({
          time: data.t,
          open: data.o,
          close: data.c,
          high: data.h,
          low: data.l,
        });
        return acc; // Return the accumulator after pushing the new object
      }, [] as { time: number; open: number; close: number; high: number; low: number }[]);

      // Emit the data to the specific user who subscribed
      socket.emit("index", rs);
    }, 3000);

    // Clear the interval on disconnect
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      clearInterval(interval);
    });
  });

  socket.on("index2", (data) => {
    console.log(`User subscribed to 'index222':`, data);

    // Simulate returning data every 3 seconds
    const interval = setInterval(async () => {
      const responseData: RS[] = await getChartData(); // usdc
      const rs = responseData.reduce((acc, data: RS) => {
        acc.push({
          time: data.t,
          open: data.o,
          close: data.c,
          high: data.h,
          low: data.l,
        });
        return acc; // Return the accumulator after pushing the new object
      }, [] as { time: number; open: number; close: number; high: number; low: number }[]);
      const responseData1: RS[] = await getChartData(
        "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4"
      ); // jlp
      const rs1 = responseData1.reduce((acc, data: RS) => {
        acc.push({
          time: data.t,
          open: data.o,
          close: data.c,
          high: data.h,
          low: data.l,
        });
        return acc; // Return the accumulator after pushing the new object
      }, [] as { time: number; open: number; close: number; high: number; low: number }[]);

      const responseData2: RS[] = await getChartData(
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
      ); // jlp
      const rs2 = responseData2.reduce((acc, data: RS) => {
        acc.push({
          time: data.t,
          open: data.o,
          close: data.c,
          high: data.h,
          low: data.l,
        });
        return acc; // Return the accumulator after pushing the new object
      }, [] as { time: number; open: number; close: number; high: number; low: number }[]);
      // Emit the data to the specific user who subscribed
      const allResponses = [
        rs?.[rs.length - 1],
        rs1?.[rs1.length - 1],
        rs2?.[rs2.length - 1],
      ];
      const average = allResponses?.reduce(
        (acc: { [key: string]: number }, curr: { [key: string]: number }) => {
          Object.keys(curr).forEach((key: string) => {
            if (key === "time") {
              acc[key] = acc[key] || curr[key];
            }
            acc[key] = (acc[key] || 0) + curr[key] / 3;
          });
          return acc;
        },
        {}
      );
      console.log({ average, allResponses });
      socket.emit("index2", [average]);
    }, 3000);

    // Clear the interval on disconnect
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      clearInterval(interval);
    });
  });
};

export { priceSocketHandler };
