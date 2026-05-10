import jwt from "jsonwebtoken";
import "dotenv/config";

export const protect = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if(!token){
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.userId
        }

        next();
    } catch (error) {
        return res.status(403).json({
        message: "Invalid or expired token",
        });
    }
};