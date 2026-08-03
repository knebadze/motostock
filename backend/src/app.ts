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
import { oauthRouter } from "./modules/oauth/oauth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { brandsRouter } from "./modules/brands/brands.routes.js";
import { modelsRouter } from "./modules/models/models.routes.js";
import { lookupsRouter } from "./modules/lookups/lookups.routes.js";
import { vehicleCatalogRouter } from "./modules/vehicle-catalog/vehicle-catalog.routes.js";
import { vehicleListingRouter } from "./modules/vehicle-listing/vehicle-listing.routes.js";
import { vehicleListingDiscountsRouter } from "./modules/vehicle-listing-discounts/vehicle-listing-discounts.routes.js";
import { vehicleListingImagesRouter } from "./modules/vehicle-listing-images/vehicle-listing-images.routes.js";
import { attributesRouter } from "./modules/attributes/attributes.routes.js";
import { attributeOptionsRouter } from "./modules/attribute-options/attribute-options.routes.js";
import { categoryFiltersRouter } from "./modules/category-filters/category-filters.routes.js";
import { vehicleCategoryFiltersRouter } from "./modules/vehicle-category-filters/vehicle-category-filters.routes.js";
import { productBrandsRouter } from "./modules/product-brands/product-brands.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { productFitmentRouter } from "./modules/product-fitment/product-fitment.routes.js";
import { productVariantsRouter } from "./modules/product-variants/product-variants.routes.js";
import { productVariantImagesRouter } from "./modules/product-variant-images/product-variant-images.routes.js";
import { productVariantDiscountsRouter } from "./modules/product-variant-discounts/product-variant-discounts.routes.js";
import { finaSyncRouter } from "./modules/fina-sync/fina-sync.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requireAuth, requireRole } from "./middleware/auth.middleware.js";
import { ROLES } from "./lib/roles.js";

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
app.use("/api/auth", oauthRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/models", modelsRouter);
app.use("/api/lookups", lookupsRouter);
app.use("/api/vehicle-catalog", vehicleCatalogRouter);
app.use("/api/vehicle-listings", vehicleListingRouter);
app.use("/api/vehicle-listings/:listingId/discounts", vehicleListingDiscountsRouter);
app.use("/api/vehicle-listings/:listingId/images", vehicleListingImagesRouter);
app.use("/api/attributes", attributesRouter);
app.use("/api/attributes/:attributeId/options", attributeOptionsRouter);
app.use("/api/category-filters", categoryFiltersRouter);
app.use("/api/vehicle-category-filters", vehicleCategoryFiltersRouter);
app.use("/api/product-brands", productBrandsRouter);
app.use("/api/products", productsRouter);
app.use("/api/products/:productId/fitments", productFitmentRouter);
app.use("/api/product-variants", productVariantsRouter);
app.use("/api/product-variants/:variantId/discounts", productVariantDiscountsRouter);
app.use("/api/product-variants/:variantId/images", productVariantImagesRouter);
app.use("/api/fina-sync", finaSyncRouter);

// registerPath() calls above already ran as a side effect of importing the
// routers, so the registry is fully populated by the time this generates.
const openApiDocument = generateOpenApiDocument();

app.use(
  "/api/docs",
  requireAuth,
  requireRole(ROLES.ADMIN),
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
app.get("/api/openapi.json", requireAuth, requireRole(ROLES.ADMIN), (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use(errorMiddleware);
