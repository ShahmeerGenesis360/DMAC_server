import axios from "axios";
import { ApiResponse, ChartData } from "priceSocket";

const BASE_URL =
  "https://fe-api.jup.ag/api/v1/charts/So11111111111111111111111111111111111111112";

const getChartData = async (
  qoute_address: string = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
): Promise<ChartData[]> => {
  // Use current time directly (milliseconds)
  const currentTime = Math.floor(Date.now() / 1000);
  const params = {
    quote_address: qoute_address,
    type: "1m", // 15-minute interval
    time_from: currentTime - 60 * 2, // 2 minutes ago
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
export { getChartData };
