import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { buildCorsOptions } from "./lib/cors";

const app: Express = express();

// Behind the shared reverse proxy — trust it so req.ip and secure cookies work.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Exactly one CORS middleware, mounted before cookie/body parsing and the API
// router so credentialed preflight (OPTIONS) requests are answered before any
// session/auth handling. Origins come from SERVICECONNECT_ALLOWED_ORIGINS.
app.use(cors(buildCorsOptions()));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
