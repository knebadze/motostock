import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { generateOpenApiDocument } from "./docs/openapi.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  "/uploads",
  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
  express.static(path.resolve("uploads")),
);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/settings", settingsRouter);

// registerPath() calls above already ran as a side effect of importing the
// routers, so the registry is fully populated by the time this generates.
const openApiDocument = generateOpenApiDocument();

app.use(
  "/api/docs",
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
      },
    },
  }),
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);
app.get("/api/openapi.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use(errorMiddleware);
