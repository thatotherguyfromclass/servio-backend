import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../db/db.js";
import { generateToken } from "../utils/generateToken.js";
import { setTokenCookie } from "../utils/setTokenCookie.js";

export const register = async (req, res) => {
    try {
        const { full_name, username, email, password, state, city } = req.body;

        if(!full_name || !username || !email || !password || !state){
            return res.status(400).json({ message: "Missing required fields" });
        }

        const cleanFullName = full_name.trim();
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanState = state.trim();
        const cleanCity = city ? city.trim() : null;

        const existingUser = await pool.query(`
            SELECT id FROM users
            WHERE email = $1
            OR username = $2`,
        [cleanEmail, cleanUsername]);
        if(existingUser.rows.length > 0){
            return res.status(400).json({ message: "User already exists" });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await pool.query(`
            INSERT INTO users (full_name, username, email, password_hash, state, city)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, full_name, username, email, bio, profile_image, state, city, whatsapp, instagram, twitter, tiktok, website, created_at`,
        [cleanFullName, cleanUsername, cleanEmail, password_hash, cleanState, cleanCity || null]);
        
        const user = newUser.rows[0];

        const token = generateToken(user.id);

        setTokenCookie(res, token);

        res.status(201).json(user);
    } catch (error) {
        if(error.code === "23505"){
            return res.status(400).json({ message: "User already exists" });
        }
        return res.status(500).json({ message: "Server error during registration" });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if(!email || !password){
            return res.status(400).json({ message: "Missing required fields" });
        }

        const cleanEmail = email.trim().toLowerCase();

        const userQuery = await pool.query(`
            SELECT * FROM users
            WHERE email = $1`,
        [cleanEmail]);

        if(userQuery.rows.length === 0){
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = userQuery.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if(!validPassword){
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user.id);

        setTokenCookie(res, token);

        delete user.password_hash;

        res.json(user);
    } catch (error) {
        return res.status(500).json({ message: "Server error during login" });
    }
};

export const me = async (req, res) => {
  try {
    const userQuery = await pool.query(
      `
      SELECT
        id,
        full_name,
        username,
        email,
        bio,
        profile_image,
        state,
        city,
        whatsapp,
        instagram,
        twitter,
        tiktok,
        website,
        created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(userQuery.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error fetching user",
    });
  }
};

export const logout = async (req, res) => {
    try {

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production"
                ? "none"
                : "lax",
        });

        res.json({
            message: "Logged out successfully",
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error during logout",
        });

    }
};