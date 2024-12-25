import { Server, Socket } from "socket.io";
import UserService from "../../service/userService";
import ChatService from "../../service/commentService";
const chatSocketHandler = (io: Server, socket: Socket): void => {
  const userService = UserService();
  const chatService = ChatService();
  // Join room event / index chat, created just for un authorized to see the chat
  socket.on("listenComment", ({ indexId }: { indexId: string }) => {
    socket.join(indexId);
  });

  // Chat message event for authenticated users
  socket.on(
    "addComment",
    async ({
      userId,
      indexId,
      message,
      isBullish,
    }: {
      userId: string;
      indexId: string;
      message: string;
      isBullish: boolean;
    }) => {
      if (!userId || !indexId || !message) return;
      const user = await userService.getUserById(userId);
      if (!user) return;
      console.log({ user });
      const newChat = await chatService.createChatbyIndexId(
        message,
        userId,
        indexId,
        isBullish
      );
      console.log({ newChat });
      if (user && newChat) {
        const obj = {
          comment: {...newChat.toObject(), userId: user},
          // user,
        };
        // send chat to all listener of the index
        io.to(indexId).emit("comment", obj);
      }
    }
  );

  // Disconnect event
  socket.on("disconnect", () => {});
};
export { chatSocketHandler };
