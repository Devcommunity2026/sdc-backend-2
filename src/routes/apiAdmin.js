import express from 'express'
import roleMiddleware from '../middlewares/roleMiddleware.js'
import Setting from "../models/settingSchema.js"
import errorClass from "../utils/errorClass.js"
import logger from "../config/logger.js"
import {
    getAdminApplications,
    updateAdminApplicationStatus,
    deleteAdminApplication,
    deleteAdminApplicationsBeforeDate,
    exportAdminApplicationsExcel,
    viewApplicationResume,
    getAuditLogs
} from "../controllers/careerAdminController.js";

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

// Protect enable, disable, and application management endpoints with admin & moderator role middleware
router.use(roleMiddleware(["admin", "moderator"]));

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

// ================= CAREER APPLICATION MANAGEMENT (ADMIN ONLY) =================
// Export applications to .xlsx (placed before parameterized routes)
router.get('/applications/export', exportAdminApplicationsExcel);

// Fetch applications with status filtering, search, and pagination
router.get('/applications', getAdminApplications);

// Update status
router.patch('/application/:id/status', updateAdminApplicationStatus);
router.post('/application/status', updateAdminApplicationStatus);

// Delete single application and cleanup resume
router.delete('/application/:id', deleteAdminApplication);
router.post('/application/delete', deleteAdminApplication);

// Bulk delete applications submitted before a cutoff date (STRICTLY ADMIN ONLY)
router.post('/applications/delete-before-date', roleMiddleware(["admin"]), deleteAdminApplicationsBeforeDate);
router.delete('/applications/before-date', roleMiddleware(["admin"]), deleteAdminApplicationsBeforeDate);

// Stream application resume PDF directly (prevents 401 ACL errors)
router.get('/application/:id/resume', viewApplicationResume);
router.get('/resume', viewApplicationResume);

// System Audit Logs (Admin only - Deletion, Addition, Status changes, etc.)
router.get('/logs', roleMiddleware(["admin"]), getAuditLogs);

export default router
