import axios from "axios";

const indexService = () => {
  const getCoinCurrentPrice = async (coinAddress: string) => {
    const response = await axios.get(
      `https://fe-api.jup.ag/api/v1/prices?list_address=${coinAddress}`
    );
    return response?.data?.prices?.[coinAddress];
  };

  return {
    getCoinCurrentPrice,
  };
};

export default indexService;
