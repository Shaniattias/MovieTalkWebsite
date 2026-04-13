import express from "express";
import cors, { CorsOptions } from "cors";
import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";

const app = express();

const allowedOrigins = new Set([
	"http://localhost:5173",
	"http://127.0.0.1:5173",
]);

const corsOptions: CorsOptions = {
	origin(origin, callback) {
		if (!origin || allowedOrigins.has(origin)) {
			callback(null, true);
			return;
		}

		callback(new Error(`Origin ${origin} is not allowed by CORS`));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

export default app;
