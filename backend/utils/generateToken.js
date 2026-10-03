import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function generateToken(userId) {
    return jwt.sign({ sub: userId }, config.jwtSecret, {
        expiresIn: "1d"
    });
}
