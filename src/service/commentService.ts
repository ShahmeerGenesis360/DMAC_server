import { PaginatedResponse } from "../types/index";
import { Comment, IComment } from "../models/comment";
import mongoose from "mongoose";

const CommentService = () => {
  const getChatById = async (id: string): Promise<IComment | null> => {
    return Comment.findById(id);
  };

  const getChatByIndexId = async (
    index: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResponse<IComment>> => {
    // Get the total number of records
    const id = new mongoose.Types.ObjectId(index);
    const totalRecords = await Comment.countDocuments({ indexId: id });

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / pageSize);

    // Fetch the paginated data
    const data = await Comment.find({indexId: id})
      .sort({ createdAt: -1 })
      .skip((page-1) * pageSize)
      .limit(pageSize)
      .exec();
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

export default CommentService;
