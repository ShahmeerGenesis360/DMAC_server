import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { GroupCoin, ICollectorDetail } from "../models/groupCoin";
import { Request, Response } from "express";
import logger from "../utils/logger";
import indexService from "../service/indexService";
import {
  calculateAveragePercentage,
  calculatePercentage,
  getChartData,
  getIndexId,
} from "../socket/price/helper";
import { GroupCoinHistory } from "../models/groupCoinHistory";
import moment, { Moment } from "moment";
import {
  calculatePercentages,
  getAllIntervals,
  getGroupByAndStartDate,
  getOrUpdateFund,
  getUniqueHolders,
  groupDataByDay,
  process24HourMetrics,
  processGraphData,
  processHistoricalData,
} from "../utils";
import { Record, IRecord } from "../models/record";
import mongoose, { Types } from "mongoose";
import { addEventToQueue } from "../queue/eventQueue";
import { RebalanceEvent } from "../types";
import * as anchor from "@coral-xyz/anchor";
import { Price } from "../models/price";
import { LiquidityLocked } from "../models/liquidityLocked";
// import { addEventToQueue } from '../queue/eventQueue';
// import { RebalanceEvent } from "../types";

interface IndexInfo {
  totalValue: number;
  totalBuy: number;
  totalSell: number;
  totalVolume: number;
  price: number;
  totalSupply: number;
  indexWorth: number;
  totalHolder: number;
}

interface ProcessedIndex {
  _id: Types.ObjectId;
  name: string;
  coins: any[];
  faq: any[];
  mintKeypairSecret: string;
  description: string;
  visitCount: number;
  imageUrl: string;
  category: string;
  collectorDetail: any;
  mintPublickey: string;
  price: number;
  // a1H: number;
  // a1D: number;
  // a1W: number;
  // graph: any[];
  // info: IndexInfo;
}

const indexController = () => {
  const groupIndexService = indexService();
  const createIndex = async (req: Request, res: Response) => {
    logger.info(`indexController create an index`);
    try {
      const {
        name,
        coins,
        category,
        description,
        faq,
        mintPublickey,
        mintKeySecret,
        tokenAllocations,
        collectorDetailApi,
        feeAmount,
        symbol,
        imageUrl,
        pda,
      } = req.body;
      console.log(
        name,
        coins,
        category,
        description,
        faq,
        mintPublickey,
        mintKeySecret,
        tokenAllocations,
        collectorDetailApi,
        feeAmount,
        symbol,
        imageUrl,
        pda,
        "data"
      );
      console.log(feeAmount, "feeamount");

      const coinList = typeof coins === "string" ? JSON.parse(coins) : coins;
      const faqList = typeof faq === "string" ? JSON.parse(faq) : faq;
      const processedDetails: ICollectorDetail[] =
        typeof collectorDetailApi === "string"
          ? JSON.parse(collectorDetailApi)
          : collectorDetailApi;

      // fee = parseFloat(feeAmount as string);
      console.log(coinList, "coinList");
      const groupCoin = new GroupCoin({
        name,
        coins: coinList,
        imageUrl,
        description,
        faq: faqList,
        mintKeySecret,
        mintPublickey,
        collectorDetail: processedDetails,
        feeAmount: feeAmount,
        category,
        symbol,
        pda,
      });

      // Save to the database
      const savedGroupCoin = await groupCoin.save();
      sendSuccessResponse({
        res,
        data: savedGroupCoin,
        message: "GroupCoin created successfully",
      });
    } catch (error) {
      logger.error(`Error while creating an index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };
  // const getAllIndex = async (req: Request, res: Response) => {
  //   logger.info(`indexController get all index`);
  //   try {
  //     const allIndexs = await GroupCoin.find();
  //     //   if (allIndexs?.length) {
  //     //     for (const index of allIndexs) {
  //     //       // Fetch all coin prices and calculate total
  //     //       for (const coin of index.coins) {
  //     //         const coinPrice = await groupIndexService.getCoinCurrentPrice(coin);
  //     //         console.log("coinPrice", coinPrice);
  //     //       }
  //     //     }
  //     //   }
  //     const allIndexData = await Promise.all(
  //       allIndexs.map(async (index) => {
  //         const coinData = await Promise.all(
  //           index.coins.map(async (coin) => {
  //             // Fetch chart data for different intervals (1h, 24h, 7d)
  //             const [data1h, data24h, data7d] = await Promise.all([
  //               getChartData(coin.address, "1H", 60),
  //               getChartData(coin.address, "1D", 1460),
  //               getChartData(coin.address, "1D", 10080),
  //             ]);

  //             console.log(`Data for coin ${coin}:`, {
  //               data1h,
  //               data24h,
  //               data7d,
  //             });

  //             // Calculate percentage change for each time frame (1 hour, 24 hours, and 7 days)
  //             const calculateForTimeFrame = (data: any[]) => {
  //               if (data.length === 0) return { o: 0, c: 0, percentage: 0 };
  //               const { o, c } = data[data.length - 1]; // Get the last data point for each timeframe
  //               return {
  //                 o,
  //                 c,
  //                 percentage: calculatePercentage(o, c),
  //               };
  //             };

  //             // Get the percentage change for each timeframe
  //             const percentage1h = calculateForTimeFrame(data1h);
  //             const percentage24h = calculateForTimeFrame(data24h);
  //             const percentage7d = calculateForTimeFrame(data7d);

  //             const getLastClosePrice = (data: any[]) => {
  //               if (data.length === 0) return 0;
  //               return data[data.length - 1].c; // Close price of the last data point
  //             };

  //             const coinPrice = getLastClosePrice(data1h);

  //             return {
  //               coinAddress: coin.address,
  //               percentage1h: percentage1h.percentage,
  //               percentage24h: percentage24h.percentage,
  //               percentage7d: percentage7d.percentage,
  //               coinPrice,
  //             };
  //           })
  //         );

  //         // Calculate the average percentage for each time frame (1h, 24h, 7d) across all coins in the index
  //         const averagePercentage1h = calculateAveragePercentage(
  //           coinData.map((data) => data.percentage1h)
  //         );
  //         const averagePercentage24h = calculateAveragePercentage(
  //           coinData.map((data) => data.percentage24h)
  //         );
  //         const averagePercentage7d = calculateAveragePercentage(
  //           coinData.map((data) => data.percentage7d)
  //         );

  //         const price =
  //           coinData.reduce((sum, data) => sum + data.coinPrice, 0) /
  //           coinData.length;

  //         return {
  //           _id: index._id,
  //           name: index.name,
  //           coins: index.coins,
  //           faq: index.faq,
  //           mintKeypairSecret: index.mintKeySecret,
  //           description: index.description,
  //           visitCount: index.visitCount,
  //           imageUrl: index.imageUrl,
  //           a1H: averagePercentage1h,
  //           a1D: averagePercentage24h,
  //           a1W: averagePercentage7d,
  //           price,
  //           category: index.category,
  //           collectorDetail: index.collectorDetail,
  //         };
  //       })
  //     );

  //     sendSuccessResponse({
  //       res,
  //       data: allIndexs?.length ? allIndexData : [],
  //       message: "Fetched all indexs successfully",
  //     });
  //   } catch (error) {
  //     logger.error(`Error while fetching all index ==> `, error.message);
  //     sendErrorResponse({
  //       req,
  //       res,
  //       error: error.message,
  //       statusCode: 500,
  //     });
  //   }
  // };

  const getAllIndexPaginated = async (req: Request, res: Response) => {
    logger.info(`indexController get all index`);
    const { page = 1, limit = 10, search } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    try {
      const allIndexs = await GroupCoin.find(query)
        .sort("-marketCap")
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const allIndexData = await Promise.all(
        allIndexs.map(async (index, sno) => {
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
          const tomorrow = new Date(today);
          tomorrow.setUTCDate(today.getUTCDate() + 1); // Start of the next day

          const twenty4hour = await Record.find({
            indexCoin: index._id,
          });
          const totalValue = twenty4hour?.reduce(
            (acc: number, item: IRecord) => acc + item.amount,
            0
          );
          const uniqueHolders = await Record.aggregate([
            {
              $match: {
                indexCoin: index._id, // Filter for specific indexCoin
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

          console.log(uniqueHolders);

          console.log("Total Holders:", uniqueHolders[0] || 0);

          // Use reduce to calculate the total amount for the interval
          const { totalBuy, totalSell, totalVolume, buyAmount, sellAmount } =
            twenty4hour.reduce(
              (acc, item) => {
                if (item.type === "deposit") {
                  acc.totalBuy += 1; // Add amount or default to 0 if undefined
                  acc.buyAmount += item.amount;
                } else {
                  acc.totalSell += 1; // Add amount or default to 0 if undefined
                  acc.sellAmount += item.amount;
                }
                acc.totalVolume += item.amount;
                return acc; // Ensure accumulator is returned
              },
              {
                totalBuy: 0,
                totalSell: 0,
                totalVolume: 0,
                buyAmount: 0,
                sellAmount: 0,
              } // Correctly formatted initial accumulator
            );
          const fund = await getOrUpdateFund(index._id);
          return {
            index,
            totalBuy,
            totalSell,
            totalVolume,
            totalValue,
            totalHolder: uniqueHolders[0]?.holders || 0,
            totalValueLocked: buyAmount - sellAmount || 0,
            price:
              fund.totalSupply === 0 ? 0 : fund.indexWorth / fund.totalSupply,
            totalSupply: fund.totalSupply,
            indexWorth: fund.indexWorth,
            buyAmount,
            rank: sno + (+page - 1) * +limit + 1,
          };
        })
      );

      const totalIndex = await GroupCoin.countDocuments(query);

      sendSuccessResponse({
        res,
        data: {
          index: allIndexs?.length ? allIndexData : [],
          total: totalIndex,
          totalPages: Math.ceil(totalIndex / Number(limit)),
          currentPage: Number(page),
        },
        message: "Fetched all indexs successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching all index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getIndexById = async (req: Request, res: Response) => {
    logger.info(`indexController get index by id`);
    try {
      const { id } = req.params;
      if (!id)
        return sendErrorResponse({
          req,
          res,
          error: "id is required",
          statusCode: 404,
        });
      const index = await GroupCoin.findById(id);
      if (!index) {
        sendErrorResponse({
          req,
          res,
          error: "Index not found",
          statusCode: 404,
        });
        return;
      }
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Aggregate deposits and withdrawals within the last 24 hours
      const volume = await Record.aggregate([
        {
          $match: {
            indexCoin: new mongoose.Types.ObjectId(id),
            timestamp: { $gte: twentyFourHoursAgo },
          },
        },
        {
          $group: {
            _id: "$indexCoin",
            totalVolume: { $sum: "$amount" },
          },
        },
      ]);

      const totalVolume = volume.length > 0 ? volume[0].totalVolume : 0;
      sendSuccessResponse({
        res,
        data: { totalVolume, ...index.toObject() },
        message: "Fetched index successfully",
      });
    } catch (error) {
      logger.error(`Error while fetching index by id ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getTimeFrame = async (time: "1D" | "1W" | "1M" | "3M") => {
    const end: Moment = moment();
    let start: Moment;
    let allIntervals: any[];

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

  const getIndexGraph = async (req: Request, res: Response) => {
    logger.info(`indexController index Graph`);
    try {
      const { time } = req.body;
      const { id } = req.params;
      // Parse coins and FAQ
      const groupcoin = await getIndexId(id);
      if (groupcoin === undefined) return;
      const { allIntervals, start, end } = await getTimeFrame(time);
      const viewsArray = [];
      for (let index = 0; index < allIntervals.length; index++) {
        const results = await GroupCoinHistory.find({
          indexId: id,
          createdAt: {
            $gt: allIntervals[index],
            $lt: allIntervals[index + 1] || end,
          },
        });
        const averageAmount =
          results.length > 0 ? results[results.length - 1].price : 0;

        viewsArray.push({
          startDate: moment(allIntervals[index]).format("MMM DD"),
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
      const { totalBuy, totalSell, totalVolume, buyAmount, sellAmount } =
        twenty4hour.reduce(
          (acc, item) => {
            if (item.type === "deposit") {
              acc.totalBuy += 1; // Add amount or default to 0 if undefined
              acc.buyAmount += item.amount;
            } else {
              acc.totalSell += 1; // Add amount or default to 0 if undefined
              acc.sellAmount += item.amount;
            }
            acc.totalVolume += item.amount;
            return acc; // Ensure accumulator is returned
          },
          {
            totalBuy: 0,
            totalSell: 0,
            totalVolume: 0,
            buyAmount: 0,
            sellAmount: 0,
          } // Correctly formatted initial accumulator
        );
      console.log("total 24 hr volume ", {
        totalValue,
        totalBuy,
        totalSell,
        totalVolume,
      });
      const fund = await getOrUpdateFund(id);

      sendSuccessResponse({
        res,
        data: {
          chart: viewsArray,
          info: {
            id,
            totalValue,
            totalBuy,
            totalSell,
            totalVolume,
            price:
              fund.totalSupply === 0 ? 0 : fund.indexWorth / fund.totalSupply,
            totalSupply: fund.totalSupply,
            indexWorth: fund.indexWorth,
            totalHolder: uniqueHolders[0]?.holders || 0,
          },
        },
        message: "Index Graph successfull",
      });
    } catch (error) {
      logger.error(`Error while index Graph an index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const updateIndex = async (req: Request, res: Response) => {
    logger.info(`indexController update an index`);
    const { id } = req.params;
    try {
      const {
        name,
        coins,
        description,
        faq,
        imageUrl,
        category,
        collectorDetails,
        symbol,
      } = req.body;

      // Parse coins and FAQ
      const coinList = coins ? coins : [];
      const faqList = faq ? faq : [];
      const collectorDetailsList = collectorDetails ? collectorDetails : [];

      console.log(id, "Edit COin");
      // Find the existing GroupCoin by ID
      const existingGroupCoin = await GroupCoin.findById(id);
      if (!existingGroupCoin) {
        return sendErrorResponse({
          req,
          res,
          error: "GroupCoin not found",
          statusCode: 404,
        });
      }

      // Handle the image (uploaded file or link)
      let updatedImageUrl = existingGroupCoin.imageUrl; // Default to the current image URL
      updatedImageUrl = imageUrl; // New image link

      // Update the GroupCoin fields
      existingGroupCoin.name = name || existingGroupCoin.name;
      existingGroupCoin.category = category || existingGroupCoin.category;
      existingGroupCoin.symbol = symbol || existingGroupCoin.symbol;
      existingGroupCoin.coins =
        coinList.length > 0 ? coinList : existingGroupCoin.coins;
      existingGroupCoin.imageUrl = updatedImageUrl;
      existingGroupCoin.description =
        description || existingGroupCoin.description;
      existingGroupCoin.faq =
        faqList.length > 0 ? faqList : existingGroupCoin.faq;
      existingGroupCoin.collectorDetail =
        collectorDetailsList || existingGroupCoin.collectorDetail;

      // Save the updated document
      const updatedGroupCoin = await existingGroupCoin.save();

      sendSuccessResponse({
        res,
        data: updatedGroupCoin,
        message: "GroupCoin updated successfully",
      });
    } catch (error) {
      logger.error(`Error while updating an index ==> `, error.message);
      sendErrorResponse({
        req,
        res,
        error: error.message,
        statusCode: 500,
      });
    }
  };

  const getChartData = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { interval } = req.query;

    try {
      const { startDate, groupBy } = getGroupByAndStartDate(interval as string);

      let aggregationPipeline: any[] = [
        {
          $match: {
            indexId: new mongoose.Types.ObjectId(id),
            createdAt: { $gte: startDate },
          },
        },
      ];

      if (groupBy) {
        aggregationPipeline.push(
          {
            $group: {
              _id: groupBy,
              lastRecord: { $last: "$$ROOT" }, // Get last record of the group
            },
          },
          {
            $project: {
              _id: 0,
              timestamp: "$lastRecord.createdAt",
              value: "$lastRecord.price",
            },
          },
          { $sort: { timestamp: 1 } }
        );
      } else {
        aggregationPipeline.push(
          {
            $project: {
              _id: 0,
              timestamp: "$createdAt",
              value: "$price",
            },
          },
          { $sort: { timestamp: 1 } }
        );
      }

      const chartData = await Price.aggregate(aggregationPipeline);

      console.log(`chartData (${interval}): `, chartData.length);
      sendSuccessResponse({
        res,
        data: { chart: chartData },
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  };
  const rebalance = async (req: Request, res: Response) => {
    logger.info(`indexController create an index`);
    try {
      const { id, coins } = req.body;
      const eventData: RebalanceEvent = {
        indexId: id,
        coins: coins,
      };

      console.log(`DMAC Rebalance: Mint=${eventData.indexId}}`);
      console.log(eventData, "rebalance eventData");
      // Add event to the Bull queue
      // await addEventToQueue('RebalanceIndex', eventData);
    } catch (err) {
      logger.error(`Error in rebalance ==> `, err.message);
      sendErrorResponse({
        req,
        res,
        error: err.message,
        statusCode: 500,
      });
    }
  };
  const getAllIndexV2 = async (req: Request, res: Response) => {
    try {
      // Extract and validate pagination params
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.max(1, Number(req.query.pageSize) || 5);
      const skip = (page - 1) * pageSize;

      // Extract category filter from query params
      const categoryParam = req.query.categories as string | undefined;
      let filterQuery: any = {};

      if (categoryParam && categoryParam.toUpperCase() !== "ALL") {
        const categoryFilter = categoryParam.includes(",")
          ? categoryParam.split(",").map((c) => c.trim())
          : categoryParam.trim();
        filterQuery.category = Array.isArray(categoryFilter)
          ? { $in: categoryFilter }
          : categoryFilter;
      }

      // Run queries in parallel with filtering
      const [totalRecords, allIndexes] = await Promise.all([
        GroupCoin.countDocuments(filterQuery),
        GroupCoin.find(filterQuery).skip(skip).limit(pageSize),
      ]);

      // Process index data
      const allIndexData = await Promise.all(
        allIndexes.map(async (index: any) => {
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

          // Aggregate deposits and withdrawals within the last 24 hours
          const volume = await Record.aggregate([
            {
              $match: {
                indexCoin: new mongoose.Types.ObjectId(index._id),
                timestamp: { $gte: twentyFourHoursAgo },
              },
            },
            {
              $group: {
                _id: "$indexCoin",
                totalVolume: { $sum: "$amount" },
              },
            },
          ]);

          const totalVolume = volume.length > 0 ? volume[0].totalVolume : 0;
          const fundData = await getOrUpdateFund(index._id);
          return {
            _id: index._id,
            name: index.name,
            coins: index.coins,
            faq: index.faq,
            mintKeypairSecret: index.mintKeySecret,
            description: index.description,
            visitCount: index.visitCount,
            imageUrl: index.imageUrl,
            category: index.category,
            collectorDetail: index.collectorDetail,
            mintPublickey: index.mintPublickey,
            totalHolder: index.holders || 0,
            price: index.price || 0,
            indexWorth: fundData?.indexWorth || 0,
            totalVolume: totalVolume,
          };
        })
      );

      return sendSuccessResponse({
        res,
        data: {
          indexes: allIndexData,
          meta: {
            totalRecords,
            totalPages: Math.ceil(totalRecords / pageSize),
            currentPage: page,
          },
        },
        message: "Fetched all indexes successfully",
      });
    } catch (err) {
      console.error("Error fetching index data:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  async function processIndex(
    index: any,
    timeRanges: any,
    allIntervals: Date[],
    now: Moment
  ): Promise<ProcessedIndex> {
    // Run all main queries in parallel
    const [indexPriceHistory, twenty4hour, uniqueHolders, fund] =
      await Promise.all([
        GroupCoinHistory.find({ indexId: index._id }),
        Record.find({
          indexCoin: index._id,
          createdAt: {
            $gte: timeRanges.rtoday,
            $lt: timeRanges.tomorrow,
          },
        }),
        getUniqueHolders(index._id),
        getOrUpdateFund(index._id),
      ]);

    // Process historical data
    // const { hourData, dayData, sevenDayData } = processHistoricalData(
    //   indexPriceHistory,
    //   timeRanges
    // );

    // // Calculate percentage changes
    // const percentages = calculatePercentages(hourData, dayData, sevenDayData);

    // Process graph data
    // const graph = await processGraphData(index._id, allIntervals, now);

    // Process 24-hour metrics
    // const metrics = process24HourMetrics(twenty4hour);

    return {
      _id: index._id,
      name: index.name,
      coins: index.coins,
      faq: index.faq,
      mintKeypairSecret: index.mintKeySecret,
      description: index.description,
      visitCount: index.visitCount,
      imageUrl: index.imageUrl,
      category: index.category,
      collectorDetail: index.collectorDetail,
      mintPublickey: index.mintPublickey,
      price: 0,
    };
  }

  const tvlGraph = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
  
      // Define allowed types
      type DateRangeKey = "daily" | "weekly" | "monthly";
      const allowedTypes: DateRangeKey[] = ["daily", "weekly", "monthly"];
  
      if (!type || !allowedTypes.includes(type as DateRangeKey)) {
        return res.status(400).json({ error: "Invalid type parameter" });
      }
  
      const dateRange: Record<DateRangeKey, number> = {
        daily: 1,
        weekly: 7,
        monthly: 31,
      };
  
      // Get the date range based on type
      const dateRangeKey = type as DateRangeKey;
      const endDate = moment().endOf("day").toDate();
      const startDate = moment()
        .subtract(dateRange[dateRangeKey], "days")
        .startOf("day")
        .toDate();
  
      const result = await LiquidityLocked.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Format date
            liquidity: 1,
            createdAt: 1, // Keep createdAt for sorting
          },
        },
        { $sort: { date: -1, createdAt: -1 } }, // Sort by date and then by createdAt descending
        {
          $group: {
            _id: "$date",
            tvl: { $last: "$liquidity" }, // Get the last liquidity value of the day
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            tvl: 1,
          },
        },
        { $sort: { date: -1 } },
      ]);
  
      sendSuccessResponse({
        res,
        data: result,
        message: "Fetched all indexes successfully",
      });
    } catch (error) {
      console.error("Error fetching TVL graph data:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  return {
    getAllIndex: getAllIndexV2,
    createIndex,
    getIndexById,
    updateIndex,
    getIndexGraph,
    rebalance,
    getAllIndexPaginated,
    tvlGraph,
    getDailyChart: getChartData,
  };
};

export default indexController;
