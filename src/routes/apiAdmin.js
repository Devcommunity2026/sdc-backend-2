import express from 'express'
import roleMiddleware from '../middlewares/roleMiddleware.js'
import Setting from "../models/settingSchema.js"
import errorClass from "../utils/errorClass.js"
import logger from "../config/logger.js"

const router = express.Router()

// GET /api/admin/registration/status (Publicly accessible so Careers page can check status)
router.get('/registration/status', async (req, res, next) => {
    try {
        const setting = await Setting.findOne({ key: "registrationOpen" });
        const isOpen = setting ? setting.value : true;

        res.status(200).json({
            success: true,
            registrationOpen: isOpen
        });
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Registration Status',
            `fetch registration status failed`,
            error
        );
        next(err);
    }
});

// Protect enable and disable endpoints with admin role middleware
router.use(roleMiddleware(["admin"]));

// POST /api/admin/registration/enable
router.post('/registration/enable', async (req, res, next) => {
    try {
        await Setting.findOneAndUpdate(
            { key: "registrationOpen" },
            { value: true },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: "Registration enabled globally"
        });
        logger.info(`userId:${req.details?.userId || 'unknown'} | updated registrationOpen to true`);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Enable Registration',
            `enable registration status failed`,
            error
        );
        next(err);
    }
});

// POST /api/admin/registration/disable
router.post('/registration/disable', async (req, res, next) => {
    try {
        await Setting.findOneAndUpdate(
            { key: "registrationOpen" },
            { value: false },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: "Registration disabled globally"
        });
        logger.info(`userId:${req.details?.userId || 'unknown'} | updated registrationOpen to false`);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Disable Registration',
            `disable registration status failed`,
            error
        );
        next(err);
    }
});

export default router
