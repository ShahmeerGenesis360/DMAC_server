import { Types } from "mongoose";
import { Reaction } from "../models/reaction";

const ReactionService = () => {
  const addReaction = (
    reaction: "LIKE" | "DISLIKE",
    userId: string,
    indexId: string,
    commentId: string
  ) => {
    return Reaction.create({ reaction, userId, indexId, commentId });
  };
  const isUserReacted = async (
    userID: string,
    commentTD: string
  ): Promise<any> => {
    // Check if user has already reacted
    return Reaction.findOne({
      userId: new Types.ObjectId(userID),
      commentId: new Types.ObjectId(commentTD),
    });
  };
  const removeReaction = async (reactionId: string) => {
    return Reaction.findByIdAndDelete(reactionId);
  };
  const updateReaction = async (
    reactionId: string,
    reaction: "LIKE" | "DISLIKE"
  ) => {
    return Reaction.findByIdAndUpdate(reactionId, { reaction });
  };
  return {
    addReaction,
    isUserReacted,
    removeReaction,
    updateReaction,
  };
};
export default ReactionService;
