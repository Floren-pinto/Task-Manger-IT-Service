import express from "express";
import cors from "cors";
import swaggerUiRouter from "./docs/swagger-ui.js";
import routes from "./routes/index.js";
import { boolParser } from "./middleware/queryBoolean.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  // Content-Disposition diekspos agar frontend bisa membaca nama file export CSV.
  app.use(cors({ exposedHeaders: ["Content-Disposition"] })); // TODO: batasi origin sebelum production
  app.use(express.json());
  app.use(boolParser());

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use(swaggerUiRouter);

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
