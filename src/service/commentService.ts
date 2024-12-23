import { PaginatedResponse } from "../types/index";
import { Comment, IComment } from "../models/comment";

const ChatService = () => {
  const getChatById = async (id: string): Promise<IComment | null> => {
    return Comment.findById(id);
  };

  const getChatByIndexId = async (
    index: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResponse<IComment>> => {
    // Get the total number of records
    const totalRecords = await Comment.countDocuments({ index });

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Fetch the paginated data
    const data = await Comment.find({ index })
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
    indexId: string,
    isBullish: boolean
  ): Promise<IComment> => {
    return Comment.create({
      message,
      userId,
      indexId,
      isBullish,
    });
  };
  return {
    getChatById,
    getChatByIndexId,
    createChatbyIndexId,
  };
};

export default ChatService;
