import { pool } from "../db/db.js";

export const createService = async (req, res) => {
  try {
    const {
      category_id,
      title,
      description,
      price,
      price_type,
      state,
      city,
    } = req.body;

    if (
      !category_id ||
      !title ||
      !description ||
      !price_type ||
      !state
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const allowedTypes = ["fixed", "hourly", "negotiable"];

    if (!allowedTypes.includes(price_type)) {
      return res.status(400).json({
        message: "Invalid price_type",
      });
    }

    if (price !== undefined && price !== null && isNaN(price)) {
      return res.status(400).json({
        message: "Price must be a number",
      });
    }

    const newService = await pool.query(
      `
      INSERT INTO services (
        user_id,
        category_id,
        title,
        description,
        price,
        price_type,
        state,
        city
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        req.user.id,
        category_id,
        title,
        description,
        price ?? null,
        price_type,
        state,
        city ?? null,
      ]
    );

    res.status(201).json(newService.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Error creating service",
    });
  }
};

export const getMyServices = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        services.*,
        categories.name AS category_name,
        categories.slug AS category_slug,
        users.username,
        users.profile_image
      FROM services
      JOIN categories 
        ON services.category_id = categories.id
      JOIN users
        ON services.user_id = users.id
      WHERE services.user_id = $1
      ORDER BY services.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};


export const getServices = async (req, res) => {
  try {
    const {
      search,
      category,
      state,
      city,
      minPrice,
      maxPrice,
      username, // 👈 ADD THIS
      page = 1,
    } = req.query;

    const limit = 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        services.*,
        users.username,
        users.profile_image,
        categories.name AS category_name,
        categories.slug AS category_slug
      FROM services
      JOIN users ON services.user_id = users.id
      JOIN categories ON services.category_id = categories.id
      WHERE 1=1
    `;

    const values = [];
    let index = 1;

    // 🔥 ADD THIS BLOCK
    if (username) {
      query += ` AND users.username = $${index}`;
      values.push(username);
      index++;
    }

    if (search) {
      query += `
        AND (
          services.title ILIKE $${index}
          OR users.username ILIKE $${index}
          OR categories.name ILIKE $${index}
        )
      `;
      values.push(`%${search}%`);
      index++;
    }

    if (category) {
      query += ` AND categories.slug = $${index}`;
      values.push(category);
      index++;
    }

    if (state) {
      query += ` AND services.state ILIKE $${index}`;
      values.push(state);
      index++;
    }

    if (city) {
      query += ` AND services.city ILIKE $${index}`;
      values.push(city);
      index++;
    }

    if (minPrice) {
      query += ` AND services.price >= $${index}`;
      values.push(minPrice);
      index++;
    }

    if (maxPrice) {
      query += ` AND services.price <= $${index}`;
      values.push(maxPrice);
      index++;
    }

    query += `
      ORDER BY services.created_at DESC
      LIMIT $${index}
      OFFSET $${index + 1}
    `;

    values.push(limit, offset);

    const services = await pool.query(query, values);

    res.json(services.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSingleService = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceQuery = await pool.query(
    `
    SELECT
        services.*,

        users.id AS user_id,
        users.full_name,
        users.username,
        users.profile_image,
        users.bio,
        users.whatsapp,
        users.instagram,
        users.twitter,
        users.tiktok,
        users.website,

        categories.name AS category_name,
        categories.slug AS category_slug,

        ROUND(AVG(reviews.rating)::numeric, 1)
        AS average_rating,

        COUNT(reviews.id)
        AS total_reviews

    FROM services

    JOIN users
    ON services.user_id = users.id

    JOIN categories
    ON services.category_id = categories.id

    LEFT JOIN reviews
    ON services.id = reviews.service_id

    WHERE services.id = $1

    GROUP BY
        services.id,
        users.id,
        categories.id
    `,
    [id]
    );

    if (serviceQuery.rows.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    res.json(serviceQuery.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;

    const existingService = await pool.query(
      `
      SELECT *
      FROM services
      WHERE id = $1
      `,
      [id]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const service = existingService.rows[0];

    if (service.user_id !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    const allowedFields = [
      "category_id",
      "title",
      "description",
      "price",
      "price_type",
      "state",
      "city",
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

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No fields provided",
      });
    }

    updates.push(`updated_at = NOW()`);

    values.push(id);

    const query = `
      UPDATE services
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING *
    `;

    const updatedService = await pool.query(
      query,
      values
    );

    res.json(updatedService.rows[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existingService = await pool.query(
      `
      SELECT *
      FROM services
      WHERE id = $1
      `,
      [id]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const service = existingService.rows[0];

    if (service.user_id !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await pool.query(
      `
      DELETE FROM services
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      message: "Service deleted",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};