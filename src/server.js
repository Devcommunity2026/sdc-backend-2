import "dotenv/config";
import app from "./app.js";
import connectDb from "./config/connectDb.js";
import logger from "./config/logger.js";
const PORT = process.env.PORT || 5000;

connectDb().then(() => {
    app.listen(PORT, () => {
        logger.info(`Server started Listenting at port ${PORT}`)
    })
})