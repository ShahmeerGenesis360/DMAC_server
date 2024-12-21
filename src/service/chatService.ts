import { PaginatedResponse } from "../types/index";
import { Chat, IChat } from "../models/chat";

const ChatService = () => {
  const getChatById = async (id: string): Promise<IChat | null> => {
    return Chat.findById(id);
  };

  const getChatByIndexId = async (
    index: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResponse<IChat>> => {
    // Get the total number of records
    const totalRecords = await Chat.countDocuments({ index });

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Fetch the paginated data
    const data = await Chat.find({ index })
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize);

    // Return the response with meta and data
    return {
      meta: {
        totalRecords,
        totalPages,
        currentPage: page,
      },
      data,
    };
  };

  const createChatbyIndexId = async (
    message: string,
    userId: string,
    indexId: string
  ): Promise<IChat> => {
    return Chat.create({
      message,
      userId,
      indexId,
    });
  };
  return {
    getChatById,
    getChatByIndexId,
    createChatbyIndexId,
  };
};

export default ChatService;
