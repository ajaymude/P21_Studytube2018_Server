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

authRoute.route("/sign-up").post(signUp);

authRoute.route("/sign-in").post(signIn);

authRoute.route("/sign-out").get(signOut);

authRoute.route("/me").get(getUser);

authRoute.route("/test").get(test);

export default authRoute;
