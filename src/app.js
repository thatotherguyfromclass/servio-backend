import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import reviewRoutes from "./routes/review.routes.js";

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reviews", reviewRoutes);

export default app;