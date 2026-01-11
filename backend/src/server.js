// Motor de la aplicación - E-commerce Valles Pasiegos

import "dotenv/config";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

// Apollo Server para GraphQL
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import { config } from "./config.js";

// Rutas REST existentes
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

// Rutas REST nuevas
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

// Modelos
import { Message } from "./models/Message.js";

// GraphQL
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Conexión a MongoDB
  try {
    await mongoose.connect(config.mongoUrl);
    console.log("✔ Conectado a MongoDB");
  } catch (error) {
    console.error("✗ Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }

  const app = express();
  const server = http.createServer(app);
  
  // Socket.IO para chat en tiempo real
  const io = new SocketIOServer(server, {
    cors: { origin: "*" }
  });

  // Middleware de autenticación para Socket.IO
  io.use((socket, next) => {
    try {
      const header = socket.handshake.headers?.authorization || "";
      const token =
        socket.handshake.auth?.token ||
        (header.startsWith("Bearer ") ? header.slice(7) : null);

      if (!token) return next(new Error("No token"));
      const payload = jwt.verify(token, config.jwtSecret);
      socket.user = { id: payload.id, username: payload.username, role: payload.role };
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  // Eventos de Socket.IO
  io.on("connection", (socket) => {
    console.log(`Usuario conectado al chat: ${socket.user.username}`);
    
    socket.on("chat:message", async ({ text }) => {
      if (typeof text !== "string" || !text.trim()) return;
      try {
        const msg = await Message.create({
          userId: socket.user.id,
          username: socket.user.username,
          text: text.trim()
        });
        io.emit("chat:message", {
          id: msg._id.toString(),
          username: msg.username,
          text: msg.text,
          createdAt: msg.createdAt
        });
      } catch (error) {
        console.error("Error al guardar mensaje:", error);
        socket.emit("error", { message: "Error al enviar mensaje" });
      }
    });
    
    socket.on("disconnect", () => {
      console.log(`Usuario desconectado del chat: ${socket.user?.username || "unknown"}`);
    });
  });

  // Middlewares Express
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  // ============ APOLLO SERVER (GraphQL) ============
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer: server })],
    formatError: (error) => {
      console.error("GraphQL Error:", error);
      return {
        message: error.message,
        code: error.extensions?.code || "INTERNAL_ERROR"
      };
    }
  });

  await apolloServer.start();

  // Middleware de GraphQL con contexto de autenticación
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Extraer token del header Authorization
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        
        let user = null;
        if (token) {
          try {
            const payload = jwt.verify(token, config.jwtSecret);
            user = { id: payload.id, username: payload.username, role: payload.role };
          } catch {
            // Token inválido, usuario no autenticado
          }
        }
        
        return { user };
      }
    })
  );

  // ============ RUTAS REST ============
  app.use("/api/auth", authRoutes);
  app.use("/api/productos", productRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/users", userRoutes);      // NUEVA
  app.use("/api/orders", orderRoutes);    // NUEVA
  app.use("/api/cart", cartRoutes);       // NUEVA

  // Servir frontend estático
  const frontendPath = path.join(__dirname, "../../frontend/public");
  app.use(express.static(frontendPath));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  // Iniciar servidor
  server.listen(config.port, () => {
    console.log(`✔ Servidor listo en http://localhost:${config.port}`);
    console.log(`✔ GraphQL Playground: http://localhost:${config.port}/graphql`);
    console.log(`✔ Base de datos: ${config.mongoUrl}`);
  });
}

// Manejo de errores globales
process.on("unhandledRejection", (error) => {
  console.error("Error no manejado:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada:", error);
  process.exit(1);
});

main().catch((e) => {
  console.error("Error al iniciar:", e);
  process.exit(1);
});