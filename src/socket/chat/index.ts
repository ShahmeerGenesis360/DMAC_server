import { Server, Socket } from "socket.io";
import UserService from "../../service/userService";
import ChatService from "../../service/chatService";
const chatSocketHandler = (io: Server, socket: Socket): void => {
  const userService = UserService();
  const chatService = ChatService();
  // Join room event / index chat, created just for un authorized to see the chat
  socket.on("joinRoom", ({ indexId }: { indexId: string }) => {
    socket.join(indexId);
  });

  // Chat message event for authenticated users
  socket.on(
    "chatMessage",
    async ({
      userId,
      indexId,
      message,
    }: {
      userId: string;
      indexId: string;
      message: string;
    }) => {
      if (!userId || !indexId || !message) return;
      const user = await userService.getUserById(userId);
      if (!user) return;
      console.log({ user });
      const newChat = await chatService.createChatbyIndexId(
        message,
        userId,
        indexId
      );
      console.log({ newChat });
      if (user && newChat) {
        const obj = {
          ...newChat,
          userId: user,
        };
        // send chat to all listener of the index
        io.to(indexId).emit("message", obj);
      }
    }
  );

  // Disconnect event
  socket.on("disconnect", () => {});
};
export { chatSocketHandler };
