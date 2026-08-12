import User from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";
export const sendToken = async (res, user, next) => {
    try {

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const token = jwt.sign(
            {
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "16d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days
            maxAge: 16 * 24 * 60 * 60 * 1000,
            sameSite: process.env.ENVIORNMENT === "production" ? "none" : "lax",
            secure: process.env.ENVIORNMENT === "production",
        });

        res.status(200).json({
            success: true,
            user: {
                email: user.email,
                role: user.role
            },
            message: "Login successful"
        });

        logger.info(`userId:${user.userId} | logged In`)
    } catch (error) {
        const err = new errorClass(false, 500, 'unable to login', 'Failed to send authTokens', error)
        next(err)
    }
};

export const sendChangePasswordToken = async (res, user, next) => {
    try {
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const passToken = jwt.sign(
            {
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        res.cookie("passToken", passToken, {
            httpOnly: true,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            maxAge: 10 * 60 * 1000,
            sameSite: process.env.ENVIORNMENT === "production" ? "none" : "lax",
            secure: process.env.ENVIORNMENT === "production",
        });

        res.status(200).json({
            success: true,
            message: "Session started"
        });

    } catch (error) {
        const err = new errorClass(false, 500, 'Unable to create session', 'Failed to send changePassToken', error)
        next(err)
    }
};

export const decodeToken = async (token) => {
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        return {
            success: true,
            data: decoded
        }
    } catch (error) {
        logger.error('Failed to decode authTokens', {
            message: error.message,
            stack: error.stack
        });
        return {
            success: false,
        }
    }
}
