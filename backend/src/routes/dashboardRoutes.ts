import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as DashboardController from "../controllers/DashbardController";

const routes = express.Router();

routes.get("/dashboard", isAuth, isAdmin, DashboardController.index);

export default routes;
