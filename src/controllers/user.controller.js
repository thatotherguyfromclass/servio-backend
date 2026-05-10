import { pool } from "../db/db.js";

export const getMyProfile = async (req, res) => {
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
      message: "Server error getting profile",
    });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const userQuery = await pool.query(
      `
      SELECT
        id,
        full_name,
        username,
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
      WHERE username = $1
      `,
      [username]
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
      message: "Server error getting profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "full_name",
      "bio",
      "state",
      "city",
      "whatsapp",
      "instagram",
      "twitter",
      "tiktok",
      "website",
    ];

    const updates = [];
    const values = [];

    let index = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${index}`);
        values.push(req.body[field]);
        index++;
      }
    }

    if (req.file) {
      updates.push(`profile_image = $${index}`);
      values.push(req.file.path);
      index++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields provided" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING id, full_name, username, email, bio, profile_image, state, city, whatsapp, instagram, twitter, tiktok, website, updated_at
    `;

    const updatedUser = await pool.query(query, values);

    res.json(updatedUser.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error updating profile" });
  }
};