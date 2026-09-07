import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import portfolioRoutes from "./routes/portfolio.js";
import quotesRoutes from "./routes/quotes.js";
import watchlistRoutes from "./routes/watchlist.js";
import { attachWsServer } from "./wsServer.js";

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.FINNHUB_API_KEY) {
  console.warn(
    "⚠️  FINNHUB_API_KEY is not set. Copy .env.example to .env and add your key."
  );
}

app.use(cors());
app.use(express.json());

app.use("/api", quotesRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/portfolio", portfolioRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const server = createServer(app);
attachWsServer(server);

server.listen(PORT, () => {
  console.log(`Stock dashboard API running on http://localhost:${PORT}`);
  console.log(`Live quotes WebSocket at ws://localhost:${PORT}/ws`);
});
