import axios from "axios";
import { ApiResponse, ChartData } from "priceSocket";
import { GroupCoin } from "../../models/groupCoin";
import logger from "../../utils/logger";

const BASE_URL =
  "https://fe-api.jup.ag/api/v1/charts/So11111111111111111111111111111111111111112";

const getChartData = async (
  qoute_address: string,
  type: string = "1m", time: number = 10
): Promise<ChartData[]> => {
  // Use current time directly (milliseconds)
  const currentTime = Math.floor(Date.now() / 1000);
  const params = {
    quote_address: qoute_address,
    type, // 15-minute interval
    time_from: currentTime - 60 * time, // 2 minutes ago
    time_to: currentTime, // Current time
  };

  try {
    // Fetch data using Axios
    const response = await axios.get<ApiResponse>(BASE_URL, { params });
    // Return chart data (handle potential missing bars)
    return response.data.bars ?? [];
  } catch (error) {
    // Enhanced error handling
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    // Return empty array for consistency
    return [];
  }
};

const getIndexId = async (id: string) => {
  logger.info(`indexController find one index by ID`);
  try {
    const groupCoin = await GroupCoin.findById(id);

    if (!groupCoin) {
      return undefined;
    }
    return groupCoin;
  } catch (error) {
    logger.error(`Error while fetching index by ID ==> `, error.message);
    return undefined;
  }
};

const calculatePercentage = (open: number, close: number) => {
  return ((close - open) / open) * 100;
};

// Helper function to calculate the average percentage for an array of percentages
const calculateAveragePercentage = (percentages: number[]) => {
  return percentages.reduce((acc, curr) => acc + curr, 0) / percentages.length;
};
export {
  getChartData,
  getIndexId,
  calculatePercentage,
  calculateAveragePercentage,
};
