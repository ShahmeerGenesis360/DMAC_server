import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { priceSocketHandler } from "./price";
import { chatSocketHandler } from "./comment";
import { chartHandler } from "./chart";

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
    chartHandler(io, socket);
    priceSocketHandler(io, socket);
    chatSocketHandler(io, socket);
    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
