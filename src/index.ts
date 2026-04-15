import express from "express";
import { structureRouter } from "./routes/structures";
import chatRoutes from "./routes/chat";
import { errorHandler } from "./middleware/validation";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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
