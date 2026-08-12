import mongoose from "mongoose";
import logger from "./logger.js";
const connectDb = async () => {
    try {
        const connection = await mongoose.connect(process.env.DB_URL)
        logger.info(`MongoDB Connected: ${connection.connection.host}`)
    } catch (error) {
        logger.error(error.message, error);
    }
}

export default connectDb