import { Server, Socket } from "socket.io";
import { Record } from "../../models/record";
import { Types } from "mongoose";
import {
  getAllIntervals,
  getOrUpdateFund,
  getUniqueHolders,
  process24HourMetrics,
  processHistoricalData,
  processGraphData,
} from "../../utils";
import moment, { Moment } from "moment";
import { Price } from "../../models/price";

function calculatePercentages(hourData: any, dayData: any, sevenDayData: any) {
  const calculateChange = (newPrice: number, oldPrice: number) => {
    if (!oldPrice || oldPrice === 0) return 0;
    return ((newPrice - oldPrice) / oldPrice) * 100;
  };

  return {
    a1H: calculateChange(hourData.currentPrice, hourData.prevPrice),
    a1D: calculateChange(dayData.currentPrice, dayData.prevPrice),
    a1W: calculateChange(sevenDayData.currentPrice, sevenDayData.prevPrice),
  };
}

// async function getPriceHistory(indexId: string, timeRanges: any) {
//   return await Price.find({
//     indexId: new Types.ObjectId(indexId),
//     createdAt: { $gte: timeRanges.sevenDaysAgo.toDate() },
//   }).sort({ createdAt: -1 });
// }

async function processIndex(indexId: string, timeRanges: any) {
  const [oneHourAgoData, dayAgoData, weekAgoData, latestData] =
    await Promise.all([
      Price.findOne({
        indexId: new Types.ObjectId(indexId),
        createdAt: { $lte: timeRanges.oneHourAgo.toDate() },
      }).sort({ createdAt: -1 }),
      Price.findOne({
        indexId: new Types.ObjectId(indexId),
        createdAt: { $lte: timeRanges.sevenDaysAgo.toDate() },
      }).sort({ createdAt: -1 }),
      Price.findOne({
        indexId: new Types.ObjectId(indexId),
        createdAt: { $lte: timeRanges.start.toDate() },
      }).sort({ createdAt: -1 }),
      Price.findOne({ indexId: new Types.ObjectId(indexId) }).sort({
        createdAt: -1,
      }),
    ]);

  const latestPrice = latestData?.price || 0;
  const percentages = calculatePercentages(
    {
      currentPrice: latestPrice,
      prevPrice: oneHourAgoData?.price || latestPrice,
    },
    { currentPrice: latestPrice, prevPrice: dayAgoData?.price || latestPrice },
    { currentPrice: latestPrice, prevPrice: weekAgoData?.price || latestPrice }
  );
  console.log(percentages, "percentage", latestData, oneHourAgoData);
  return { info: { ...percentages } };
}

const processCandleChart = async (indexId: string, intervalMinutes = 5) => {
  const now = moment();
  const startTime = now.clone().subtract(24, "hours");

  // Fetch all price data within the last 24 hours
  const priceData = await Price.find({
    indexId: new Types.ObjectId(indexId),
    createdAt: { $gte: startTime.toDate(), $lte: now.toDate() },
  }).sort({ createdAt: 1 }); // Ensure ascending order

  const groupedData = [];

  for (let i = 0; i < 24 * (60 / intervalMinutes); i++) {
    const intervalStart = startTime.clone().add(i * intervalMinutes, "minutes");
    const intervalEnd = intervalStart.clone().add(intervalMinutes, "minutes");

    const pricesInInterval: any = priceData.filter(
      (record: any) =>
        moment(record.createdAt).isSameOrAfter(intervalStart) &&
        moment(record.createdAt).isBefore(intervalEnd)
    );

    if (pricesInInterval.length > 0) {
      groupedData.push({
        time: intervalStart.unix(), // Use UNIX timestamp for strict ordering
        open: parseFloat(pricesInInterval[0].price),
        high: parseFloat(
          Math.max(...pricesInInterval.map((p: any) => p.price)).toFixed(2)
        ),
        low: parseFloat(
          Math.min(...pricesInInterval.map((p: any) => p.price)).toFixed(2)
        ),
        close: parseFloat(pricesInInterval[pricesInInterval.length - 1].price),
      });
    }
  }

  // Ensure strict ascending order by time
  return groupedData
    .sort((a, b) => a.time - b.time)
    .map(({ time, open, high, low, close }) => {
      const date = new Date(time * 1000);
      return {
        time,
        open,
        high,
        low,
        close,
      };
    });
};

const infoHandler = (io: Server, socket: Socket) => {
  socket.on("price_info", async (indexId) => {
    console.log(`User subscribed to 'price_info' for index:`, indexId);
    const now = moment();
    const timeRanges = {
      oneHourAgo: now.clone().subtract(1, "hour"),
      sevenDaysAgo: now.clone().subtract(7, "days"),
      start: now.clone().subtract(6, "days"),
    };

    const fetchAndEmitData = async () => {
      try {
        const data = await processIndex(indexId, timeRanges);
        socket.emit(`price_info:${indexId}`, data);
      } catch (err) {
        console.error("Error fetching or emitting data:", err);
      }
    };

    fetchAndEmitData();
    const interval = setInterval(fetchAndEmitData, 60000);
    socket.on("disconnect", () => clearInterval(interval));
  });
};

const candleHandler = (io: Server, socket: Socket) => {
  socket.on("candle_chart", async (indexId) => {
    console.log(`User subscribed to 'candle_chart' for index:`, indexId);

    const fetchAndEmitCandleData = async () => {
      try {
        const candleData = await processCandleChart(indexId);
        socket.emit(`candle_chart:${indexId}`, candleData);
      } catch (err) {
        console.error("Error fetching or emitting candle data:", err);
      }
    };

    fetchAndEmitCandleData();
    const interval = setInterval(fetchAndEmitCandleData, 60000);
    socket.on("disconnect", () => clearInterval(interval));
  });
};

export { infoHandler, candleHandler };
