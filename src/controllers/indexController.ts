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
  getOrUpdateFund,
  getUniqueHolders,
  groupDataByDay,
  process24HourMetrics,
  processGraphData,
  processHistoricalData,
} from "../utils";
import { Record, IRecord } from "../models/record";
import { Types } from "mongoose";
import { addEventToQueue } from "../queue/eventQueue";
import { RebalanceEvent } from "../types";
import * as anchor from "@coral-xyz/anchor";
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
      } = req.body;
      const coinList = coins;
      const faqList = faq;
      let fee = feeAmount.slice(1, feeAmount.length - 1);
      fee = parseFloat(feeAmount as string);
      const processedDetails: ICollectorDetail[] =
        collectorDetailApi;

      const groupCoin = new GroupCoin({
        name,
        coins: coinList,
        imageUrl,
        description,
        faq: faqList,
        mintKeySecret,
        mintPublickey,
        collectorDetail: processedDetails,
        feeAmount: fee,
        category,
        symbol,
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
  const getAllIndex = async (req: Request, res: Response) => {
    logger.info(`indexController get all index`);
    try {
      const allIndexs = await GroupCoin.find();
      //   if (allIndexs?.length) {
      //     for (const index of allIndexs) {
      //       // Fetch all coin prices and calculate total
      //       for (const coin of index.coins) {
      //         const coinPrice = await groupIndexService.getCoinCurrentPrice(coin);
      //         console.log("coinPrice", coinPrice);
      //       }
      //     }
      //   }
      const allIndexData = await Promise.all(
        allIndexs.map(async (index) => {
          const coinData = await Promise.all(
            index.coins.map(async (coin) => {
              // Fetch chart data for different intervals (1h, 24h, 7d)
              const [data1h, data24h, data7d] = await Promise.all([
                getChartData(coin.address, "1H", 60),
                getChartData(coin.address, "1D", 1460),
                getChartData(coin.address, "1D", 10080),
              ]);

              console.log(`Data for coin ${coin}:`, {
                data1h,
                data24h,
                data7d,
              });

              // Calculate percentage change for each time frame (1 hour, 24 hours, and 7 days)
              const calculateForTimeFrame = (data: any[]) => {
                if (data.length === 0) return { o: 0, c: 0, percentage: 0 };
                const { o, c } = data[data.length - 1]; // Get the last data point for each timeframe
                return {
                  o,
                  c,
                  percentage: calculatePercentage(o, c),
                };
              };

              // Get the percentage change for each timeframe
              const percentage1h = calculateForTimeFrame(data1h);
              const percentage24h = calculateForTimeFrame(data24h);
              const percentage7d = calculateForTimeFrame(data7d);

              const getLastClosePrice = (data: any[]) => {
                if (data.length === 0) return 0;
                return data[data.length - 1].c; // Close price of the last data point
              };

              const coinPrice = getLastClosePrice(data1h);

              return {
                coinAddress: coin.address,
                percentage1h: percentage1h.percentage,
                percentage24h: percentage24h.percentage,
                percentage7d: percentage7d.percentage,
                coinPrice,
              };
            })
          );

          // Calculate the average percentage for each time frame (1h, 24h, 7d) across all coins in the index
          const averagePercentage1h = calculateAveragePercentage(
            coinData.map((data) => data.percentage1h)
          );
          const averagePercentage24h = calculateAveragePercentage(
            coinData.map((data) => data.percentage24h)
          );
          const averagePercentage7d = calculateAveragePercentage(
            coinData.map((data) => data.percentage7d)
          );

          const price =
            coinData.reduce((sum, data) => sum + data.coinPrice, 0) /
            coinData.length;

          return {
            _id: index._id,
            name: index.name,
            coins: index.coins,
            faq: index.faq,
            mintKeypairSecret: index.mintKeySecret,
            description: index.description,
            visitCount: index.visitCount,
            imageUrl: index.imageUrl,
            a1H: averagePercentage1h,
            a1D: averagePercentage24h,
            a1W: averagePercentage7d,
            price,
            category: index.category,
            collectorDetail: index.collectorDetail,
          };
        })
      );

      sendSuccessResponse({
        res,
        data: allIndexs?.length ? allIndexData : [],
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
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const allIndexData = await Promise.all(
        allIndexs.map(async (index) => {
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
      sendSuccessResponse({
        res,
        data: index,
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

  // const rebalance = async (req: Request, res: Response) => {
  //   logger.info(`indexController create an index`);
  //   try {
  //     const {
  //       id,
  //       newWeights,
  //       // coins
  //     } = req.body;

  //     // const coins = []
  //     // const coinList = JSON.parse(coins);

  //     let weight: number[] = newWeights;
  //     let weights = weight.map((ele) => new anchor.BN(ele));
  //     const eventData: RebalanceEvent =  {
  //       indexId: id,
  //       weight: weights,
  //       // coins: coinList
  //     }

  //     console.log(`DMAC Rebalance: Mint=${eventData.indexId}}`);
  //     console.log(eventData, "rebalance eventData")
  //     // Add event to the Bull queue
  //     await addEventToQueue('RebalanceIndex', eventData);
  //     res.status(200).json({ message: "Rebalance event queued successfully" });
  //   }catch(err){
  //     logger.error(`Error in rebalance ==> `, err.message);
  //     sendErrorResponse({
  //       req,
  //       res,
  //       error: err.message,
  //       statusCode: 500,
  //     });
  //   }
  // }
  const rebalance = async (req: Request, res: Response) => {
    logger.info(`indexController create an index`);
    try {
      const { id } = req.body;
      // const eventData: RebalanceEvent =  {
      //   indexId: id,
      // }

      // console.log(`DMAC Rebalance: Mint=${eventData.indexId}}`);
      // console.log(eventData, "rebalance eventData")
      // // Add event to the Bull queue
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

      // Calculate time ranges once
      const now = moment();
      const timeRanges = {
        rtoday: moment().startOf("day").toDate(),
        tomorrow: moment().startOf("day").add(1, "day").toDate(),
        oneHourAgo: now.clone().subtract(1, "hour"),
        today: now.format("YYYY-MM-DD"),
        sevenDaysAgo: now.clone().subtract(7, "days"),
        start: now.clone().subtract(6, "days"),
      };

      // Run queries in parallel
      const [totalRecords, allIndexes] = await Promise.all([
        GroupCoin.countDocuments(),
        GroupCoin.find().skip(skip).limit(pageSize),
        // getAllIntervals(timeRanges.start, now, 7)
      ]);

      const allIndexData = await Promise.all(
        allIndexes.map(async (index) => {
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
            price:
              fundData.totalSupply === 0
                ? 0
                : fundData.indexWorth / fundData.totalSupply,
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

      // Validate the 'type' query parameter with proper type assertion and checking
      if (!["daily", "weekly", "monthly"].includes(type as string)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      // Define a type for allowed types
      type DateRangeKey = "daily" | "weekly" | "monthly";

      // Map the string keys to their respective date ranges
      const dateRange: Record<DateRangeKey, number> = {
        daily: 6,
        weekly: 6 * 7,
        monthly: 31 * 7,
      };

      // Ensure 'type' is treated as a valid key from the `dateRange` object
      const dateRangeKey = type as DateRangeKey;

      // Set the end date to today's date
      const end: Moment = moment();

      // Calculate the start date by subtracting the specified range from the end date
      console.log(">> :", dateRange[dateRangeKey]);
      const start: Moment = moment(end).subtract(
        dateRange[dateRangeKey],
        "days"
      );

      // Assume getAllIntervals is defined elsewhere with proper typing
      const allIntervals: Date[] = await getAllIntervals(start, end, 7);
      console.log({ allIntervals });
      const allIndexes = await GroupCoin.find();

      const data = await Promise.all(
        allIndexes.map(async (index) => {
          const viewsArray = [];
          for (let counter = 0; counter < allIntervals.length; counter++) {
            const result = await Record.aggregate([
              {
                $match: {
                  indexCoin: index._id, // Filter for a specific indexCoin
                  createdAt: {
                    $gt: allIntervals[counter],
                    $lt: allIntervals[counter + 1] || end,
                  },
                },
              },
              {
                $group: {
                  _id: "$indexCoin", // Group by unique holder ID
                  indexCoin: { $first: "$indexCoin" }, // Retain indexCoin for later grouping
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
            ]);
            viewsArray.push({
              startDate: moment(allIntervals[counter]).format("MMM DD"),
              indexCoin: result?.[0]?.indexCoin || index._id,
              totalDeposit: result?.[0]?.totalDeposit ?? 0,
              totalWithdrawal: result?.[0]?.totalWithdrawal ?? 0,
            });
          }

          return {
            indexId: index._id,
            ...viewsArray,
          };
        })
      );

      sendSuccessResponse({
        res,
        data: data,
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
  };
};

export default indexController;
