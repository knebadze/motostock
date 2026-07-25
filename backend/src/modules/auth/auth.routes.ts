import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { authRateLimit } from "../../middleware/rateLimit.middleware.js";
import { login, logout, register } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  register,
);
authRouter.post("/login", authRateLimit, validate(loginSchema), login);
authRouter.post("/logout", logout);
