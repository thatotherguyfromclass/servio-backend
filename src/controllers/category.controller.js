import { pool } from "../db/db.js";

export const getCategories = async (req, res) => {
    try {
        const categoriesQuery = await pool.query(`
            SELECT *
            FROM categories
            ORDER BY name ASC`);
        
            res.json(categoriesQuery.rows);
    } catch (error) {
        res.status(500).json({ message: "Error getting categories" })
    }
};