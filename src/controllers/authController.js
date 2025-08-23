// controllers/auth.controller.js
import { asyncHandler, CustomError } from "../middlewares/errorHandler.js";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

// POST /api/v1/auth/sign-up
export const signUp = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // 1) basic validation & normalization
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new CustomError("Name, email and password are required", 400);
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  // 2) pre-check (DB must also have a unique index on email)
  const userExists = await User.findOne({ email: normalizedEmail }).lean();
  if (userExists) throw new CustomError("User already exists", 409);

  // 3) create (hash password in schema pre('save'))
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
  });

  // 4) set auth cookie
  generateToken(res, user._id);

  // 5) respond
  return res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
  });
});

// POST /api/v1/auth/sign-in
export const signIn = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    throw new CustomError("Email and password are required", 400);
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  // If password is select:false in schema, add +password here
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password"
  );
  if (!user || !(await user.matchPassword(password))) {
    throw new CustomError("Invalid email or password", 401);
  }

  generateToken(res, user._id);

  return res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
  });
});

// POST /api/v1/auth/sign-out
export const signOut = (req, res) => {
  // Clear the JWT cookie securely
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
  });
  return res.sendStatus(204); // no body for sign-out
};

// GET /api/v1/auth/me
export const getUser = asyncHandler(async (req, res) => {
  // req.user._id should be set by auth middleware
  const user = await User.findById(req.user._id)
    .select("_id name email isAdmin")
    .lean();

  if (!user) throw new CustomError("User not found", 404);

  return res.status(200).json(user);
});

// GET /api/auth/test 
export const test = (req, res) => {
  res.json({ message: "Auth route is working!" });
};
