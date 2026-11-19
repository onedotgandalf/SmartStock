// Builds the Express app: security middleware, JSON parsing, routes, errors.
// Kept separate from index.js so the app can be tested without starting a server.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);            // correct client IPs behind a hosting proxy (for rate limiting)
app.use(helmet());                    // secure HTTP headers
app.use(cors({ origin: env.clientOrigin })); // only our React app may call the API from a browser
app.use(express.json({ limit: "1mb" }));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);
