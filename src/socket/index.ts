import { Server } from "socket.io";
import { Server as HTTPServer } from "http";

export const initializeSocket = (server: HTTPServer): void => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend URL
      methods: ["GET", "POST"],
    },
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
