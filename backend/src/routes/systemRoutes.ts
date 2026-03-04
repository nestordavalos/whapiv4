import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as sytemController from "../controllers/SystemController";

const systemRoutes = Router();

systemRoutes.post("/restartpm2", isAuth, isAdmin, sytemController.restartPm2);

export default systemRoutes;
