import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { priceSocketHandler } from "./price";
import { chatSocketHandler } from "./comment";

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

    priceSocketHandler(io, socket);
    chatSocketHandler(io, socket);
    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
