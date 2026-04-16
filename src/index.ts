import express from "express";
import { structureRouter } from "./routes/structures.js";
import chatRoutes from "./routes/chat.js";
import { errorHandler } from "./middleware/validation.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS Middleware - Allow frontend requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow localhost:5173, 5174 (dev), and production if needed
  const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];
  
  if (allowedOrigins.includes(origin || "")) {
    res.setHeader("Access-Control-Allow-Origin", origin!);
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  
  next();
});

// Routes
app.use("/api/structures", structureRouter);
app.use("/api", chatRoutes);
app.get("/", (_req, res) => {
  res.json({message: "Anatomy API", endpoints: ["/api/structures", "/api/chat", "/health"]});  
})

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
