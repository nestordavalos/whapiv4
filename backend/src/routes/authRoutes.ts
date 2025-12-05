import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import { authLimiter, createLimiter } from "../middleware/rateLimiters";

const authRoutes = Router();

authRoutes.post("/signup", createLimiter, UserController.store);

authRoutes.post("/login", authLimiter, SessionController.store);

authRoutes.post("/refresh_token", SessionController.update);

authRoutes.delete("/logout", isAuth, SessionController.remove);

export default authRoutes;
