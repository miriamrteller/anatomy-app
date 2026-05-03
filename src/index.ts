import express from "express";
import helmet from "helmet";
import { structureRouter } from "./routes/structures.js";
import chatRoutes from "./routes/chat.js";
import { errorHandler } from "./middleware/validation.js";
import { generateSystemPrompt } from "./lib/systemPrompt.js";
import { config } from "./lib/config.js";
import { apiChatLimiter, apiReadLimiter, healthLimiter } from "./middleware/rateLimiter.js";

const app = express();

app.use(helmet());
app.use(express.json());

const isDevelopment = config.NODE_ENV === "development";

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = isDevelopment
    ? ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
    : [config.FRONTEND_URL];

  if (allowedOrigins.includes(origin || "")) {
    res.setHeader("Access-Control-Allow-Origin", origin!);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

app.use("/api/structures", apiReadLimiter, structureRouter);
app.use("/api/chat", apiChatLimiter);
app.use("/api", chatRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Anatomy API", endpoints: ["/api/structures", "/api/chat", "/health"] });
});

app.get("/health", healthLimiter, (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(errorHandler);

async function startServer() {
  try {
    console.log("[Server] Initializing system prompt from database...");
    await generateSystemPrompt();
    console.log("[Server] ✅ System prompt initialized");

    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${config.PORT}`);
      console.log(`📡 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 CORS enabled for: ${config.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error("[Server] ❌ Failed to initialize system prompt:", error);
    process.exit(1);
  }
}

startServer();
