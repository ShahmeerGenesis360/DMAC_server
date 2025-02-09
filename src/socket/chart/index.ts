import { Server, Socket } from "socket.io";
import { Record } from "../../models/record";
import { Types } from "mongoose";
import {
  calculatePercentages,
  getAllIntervals,
  getOrUpdateFund,
  getUniqueHolders,
  process24HourMetrics,
  processHistoricalData,
  processGraphData,
} from "../../utils";
import moment, { Moment } from "moment";
import { GroupCoinHistory } from "../../models/groupCoinHistory";

async function processIndex(
  index: any,
  timeRanges: any,
  allIntervals: Date[],
  now: Moment
): Promise<any> {
  const [indexPriceHistory, twenty4hour, uniqueHolders, fund] =
    await Promise.all([
      GroupCoinHistory.find({ indexId: index }),
      Record.find({
        indexCoin: new Types.ObjectId(index),
        createdAt: { $gte: timeRanges.rtoday, $lt: timeRanges.tomorrow },
      }),
      getUniqueHolders(index),
      getOrUpdateFund(index),
    ]);

  // Process historical data
  const { hourData, dayData, sevenDayData } = processHistoricalData(
    indexPriceHistory,
    timeRanges
  );

  // Calculate percentage changes
  const percentages = calculatePercentages(hourData, dayData, sevenDayData);

  const graph = await processGraphData(index, allIntervals, now);

  const metrics = process24HourMetrics(twenty4hour);

  return {
    graph,
    info: {
      ...metrics,
      price: fund.totalSupply === 0 ? 0 : fund.indexWorth / fund.totalSupply,
      totalSupply: fund.totalSupply,
      indexWorth: fund.indexWorth,
      totalHolder: uniqueHolders[0]?.holders || 0,
      ...percentages,
    },
  };
}

const chartHandler = (io: Server, socket: Socket) => {
  socket.on("graph_info", async (id) => {
    console.log(`User subscribed to 'index2':`, id);
    let firstFetch = true;
    const now = moment();
    const timeRanges = {
      rtoday: moment().startOf("day").toDate(),
      tomorrow: moment().startOf("day").add(1, "day").toDate(),
      oneHourAgo: now.clone().subtract(1, "hour"),
      today: now.format("YYYY-MM-DD"),
      sevenDaysAgo: now.clone().subtract(7, "days"),
      start: now.clone().subtract(6, "days"),
    };
    const allIntervals = await getAllIntervals(timeRanges.start, now, 7);

    const fetchAndEmitData = async () => {
      try {
        const data = await processIndex(id, timeRanges, allIntervals, now);
        socket.emit(`graph_info:${id}`, data);
        firstFetch = false;
      } catch (err) {
        console.error("Error fetching or emitting data:", err);
      }
    };

    fetchAndEmitData();
    const interval = setInterval(fetchAndEmitData, 60000);
    socket.on("disconnect", () => clearInterval(interval));
  });
};

export { chartHandler };
