import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve React frontend in production (Railway)
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(
    __dirname,
    "../../rayan-hotel/dist/public",
  );
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/*splat", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    logger.info({ frontendDist }, "Serving React frontend");
  }
}

export default app;
