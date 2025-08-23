// src/routes/user.routes.js
import { Router } from "express";
import {
  getUser,
  signIn,
  signOut,
  signUp,
  test,
} from "../controllers/mainController.js";

const authRoute = Router();

authRoute.route("/sing-up").get(signUp);

authRoute.route("/sing-in").get(signIn);

authRoute.route("/sing-out").get(signOut);

authRoute.route("/me").get(getUser);

authRoute.route("/test").get(test);

export default authRoute;
