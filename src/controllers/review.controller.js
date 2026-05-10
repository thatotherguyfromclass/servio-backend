import { pool } from "../db/db.js";

export const createReview = async (req, res) => {
  try {
    const {
      service_id,
      rating,
      comment,
    } = req.body;

    if (!service_id || !rating) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const serviceQuery = await pool.query(
      `
      SELECT *
      FROM services
      WHERE id = $1
      `,
      [service_id]
    );

    if (serviceQuery.rows.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const existingReview = await pool.query(
      `
      SELECT *
      FROM reviews
      WHERE user_id = $1
      AND service_id = $2
      `,
      [req.user.id, service_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        message: "You already reviewed this service",
      });
    }

    const newReview = await pool.query(
      `
      INSERT INTO reviews (
        user_id,
        service_id,
        rating,
        comment
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        req.user.id,
        service_id,
        rating,
        comment || null,
      ]
    );

    res.status(201).json(newReview.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getServiceReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewsQuery = await pool.query(
      `
      SELECT
        reviews.id,
        reviews.rating,
        reviews.comment,
        reviews.created_at,

        users.id AS user_id,
        users.username,
        users.profile_image

      FROM reviews

      JOIN users
      ON reviews.user_id = users.id

      WHERE reviews.service_id = $1

      ORDER BY reviews.created_at DESC
      `,
      [id]
    );

    const averageQuery = await pool.query(
      `
      SELECT
        ROUND(AVG(rating)::numeric, 1)
        AS average_rating,

        COUNT(*) AS total_reviews

      FROM reviews

      WHERE service_id = $1
      `,
      [id]
    );

    res.json({
      reviews: reviewsQuery.rows,

      stats: averageQuery.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};