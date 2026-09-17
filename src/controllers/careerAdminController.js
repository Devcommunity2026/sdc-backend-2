import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import mongoose from "mongoose";
import Application from "../models/applicationSchema.js";
import cloudinary from "../config/cloudConfig.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";

// Normalize status values between UI formats and database enums
const normalizeStatusQuery = (status) => {
    if (!status || status === "All" || status === "ALL") return null;
    const upper = status.toUpperCase().replace(/\s+/g, "_");
    if (upper === "ON_HOLD") return ["ON_HOLD", "On Hold"];
    if (upper === "SELECTED") return ["SELECTED", "Selected"];
    if (upper === "REJECTED") return ["REJECTED", "Rejected"];
    if (upper === "APPLIED") return ["Applied", "ON_HOLD", "On Hold"];
    return [status];
};

const normalizeStatusInput = (status) => {
    if (!status) return "ON_HOLD";
    const upper = status.toUpperCase().replace(/\s+/g, "_");
    if (upper === "ON_HOLD") return "ON_HOLD";
    if (upper === "SELECTED") return "SELECTED";
    if (upper === "REJECTED") return "REJECTED";
    return status;
};

/**
 * Get paginated applications with search and status filtering
 */
export const getAdminApplications = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const status = req.query.status;
        const search = req.query.search ? req.query.search.trim() : "";
        const domain = req.query.domain;

        const query = {};

        // Status filter
        const statusValues = normalizeStatusQuery(status);
        if (statusValues) {
            query.status = { $in: statusValues };
        }

        // Domain filter
        if (domain && domain !== "All" && domain !== "All Domains") {
            query.domain = domain;
        }

        // Search query across name, email, phone, and domain
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { name: regex },
                { email: regex },
                { phone: regex },
                { domain: regex },
                { position: regex }
            ];
        }

        const skip = (page - 1) * limit;

        const [applications, totalApplications] = await Promise.all([
            Application.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Application.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalApplications / limit) || 1;

        const enrichedApplications = applications.map((app) => {
            let viewUrl = app.resume;
            if (app.resumePublicId) {
                try {
                    viewUrl = cloudinary.utils.private_download_url(
                        app.resumePublicId.replace(/\.pdf$/i, ""),
                        "pdf",
                        { resource_type: "image", type: "upload", attachment: false }
                    );
                } catch (e) {
                    viewUrl = app.resume;
                }
            }
            return {
                ...app,
                resumeViewUrl: viewUrl || app.resume,
            };
        });

        return res.status(200).json({
            success: true,
            data: enrichedApplications,
            applications: enrichedApplications,
            pagination: {
                currentPage: page,
                totalPages,
                totalApplications,
                total: totalApplications,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        logger.error("[Admin Career] Error fetching applications:", error);
        const err = new errorClass(false, 500, "Unable to fetch applications", "Fetch applications failed", error);
        next(err);
    }
};

/**
 * Update career application status (ON_HOLD, SELECTED, REJECTED)
 */
export const updateAdminApplicationStatus = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.body?.id || req.body?.applicationId || req.query?.id;
        const rawStatus = req.body?.status;

        if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Application ID is required"
            });
        }

        const normalizedStatus = normalizeStatusInput(rawStatus);

        const validStatuses = ["ON_HOLD", "SELECTED", "REJECTED", "On Hold", "Selected", "Rejected", "Applied"];
        if (!validStatuses.includes(normalizedStatus) && !validStatuses.includes(rawStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be ON_HOLD, SELECTED, or REJECTED"
            });
        }

        const updated = await Application.findByIdAndUpdate(
            targetId,
            { $set: { status: normalizedStatus } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'admin'}, id: ${req.details.userId || req.details._id})` : 'Unknown Admin';
        logger.info(`[STATUS UPDATE] Application status updated to ${normalizedStatus} by ${operator} | App ID: ${targetId} | Applicant: ${updated.name} | Email: ${updated.email}`);

        return res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            data: updated
        });

    } catch (error) {
        logger.error("[Admin Career] Error updating status:", error);
        const err = new errorClass(false, 500, "Unable to update application", "Update application status failed", error);
        next(err);
    }
};

/**
 * Delete single career application and cleanup associated Cloudinary resume
 */
export const deleteAdminApplication = async (req, res, next) => {
    try {
        const targetId = req.params?.id || req.body?.id || req.body?.applicationId || req.query?.id;

        if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Application ID is required"
            });
        }

        const application = await Application.findById(targetId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // Clean up resume file in Cloudinary
        let publicId = application.resumePublicId;
        if (!publicId && application.resume && typeof application.resume === "string" && application.resume.includes("cloudinary.com")) {
            const match = application.resume.match(/(?:image|raw)\/upload\/(?:v\d+\/)?(resume\/[^.?#]+)/);
            if (match && match[1]) {
                publicId = match[1];
            }
        }

        if (publicId) {
            logger.info(`[Admin Career] Cleaning up Cloudinary resume asset: ${publicId}`);
            try {
                // Destroy as image and raw to cover all storage formats
                await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
                await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
            } catch (cloudErr) {
                logger.warn(`[Admin Career] Could not delete Cloudinary asset ${publicId}:`, cloudErr?.message || cloudErr);
            }
        }

        await Application.findByIdAndDelete(targetId);

        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'admin'}, id: ${req.details.userId || req.details._id})` : 'Unknown Admin';
        logger.info(`[DELETION] Application deleted by ${operator} | App ID: ${targetId} | Applicant: ${application.name} | Email: ${application.email} | Position: ${application.position || application.domain}`);

        return res.status(200).json({
            success: true,
            message: "Application deleted successfully",
            id: targetId
        });

    } catch (error) {
        logger.error("[Admin Career] Error deleting application:", error);
        const err = new errorClass(false, 500, "Unable to delete application", "Delete application failed", error);
        next(err);
    }
};

/**
 * Delete applications submitted strictly before a specified cutoff date (Admin Only)
 * Also cleans up all associated resumes in Cloudinary.
 */
export const deleteAdminApplicationsBeforeDate = async (req, res, next) => {
    try {
        const rawDate = req.body?.date || req.query?.date;
        if (!rawDate) {
            return res.status(400).json({
                success: false,
                message: "Cutoff date is required"
            });
        }

        const cutoffDate = new Date(rawDate);
        if (isNaN(cutoffDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format provided"
            });
        }

        // Match applications submitted strictly before the target date
        const query = { createdAt: { $lt: cutoffDate } };

        // 1. Fetch matching applications to clean up their Cloudinary resumes
        const appsToDelete = await Application.find(query, { _id: 1, resumePublicId: 1, resume: 1 }).lean();

        let resumesCleaned = 0;
        for (const app of appsToDelete) {
            let publicId = app.resumePublicId;
            if (!publicId && app.resume && typeof app.resume === "string" && app.resume.includes("cloudinary.com")) {
                const match = app.resume.match(/(?:image|raw)\/upload\/(?:v\d+\/)?(resume\/[^.?#]+)/);
                if (match && match[1]) {
                    publicId = match[1];
                }
            }

            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
                    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
                    resumesCleaned++;
                } catch (cloudErr) {
                    logger.warn(`[Admin Career] Could not delete Cloudinary asset ${publicId}:`, cloudErr?.message || cloudErr);
                }
            }
        }

        // 2. Perform bulk delete in MongoDB
        const result = await Application.deleteMany(query);

        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'admin'}, id: ${req.details.userId || req.details._id})` : 'Unknown Admin';
        logger.info(`[DELETION] Bulk delete before ${cutoffDate.toISOString()} executed by ${operator} | Deleted Count: ${result.deletedCount} applications | Resumes Cleaned: ${resumesCleaned}`);

        return res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} application(s) submitted before ${cutoffDate.toISOString().split("T")[0]}`,
            deletedCount: result.deletedCount,
            resumesCleaned
        });

    } catch (error) {
        logger.error("[Admin Career] Error in bulk delete before date:", error);
        const err = new errorClass(false, 500, "Unable to bulk delete applications", "Bulk delete before date failed", error);
        next(err);
    }
};

/**
 * Export career applications to real .xlsx file by status
 */
export const exportAdminApplicationsExcel = async (req, res, next) => {
    try {
        const rawStatus = (req.query.status || "ALL").toUpperCase().replace(/\s+/g, "_");

        let filename;
        const query = {};

        switch (rawStatus) {
            case "SELECTED":
                filename = "selected-candidates.xlsx";
                query.status = { $in: ["SELECTED", "Selected"] };
                break;
            case "REJECTED":
                filename = "rejected-candidates.xlsx";
                query.status = { $in: ["REJECTED", "Rejected"] };
                break;
            case "ON_HOLD":
                filename = "on-hold-candidates.xlsx";
                query.status = { $in: ["ON_HOLD", "On Hold"] };
                break;
            case "ALL":
            default:
                filename = "all-candidates.xlsx";
                break;
        }

        const applications = await Application.find(query).sort({ createdAt: -1 }).lean();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "SDC Admin Portal";
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet("Candidates");

        worksheet.columns = [
            { header: "Applicant Name", key: "name", width: 24 },
            { header: "Email", key: "email", width: 30 },
            { header: "Phone", key: "phone", width: 18 },
            { header: "Position Applied", key: "position", width: 26 },
            { header: "College", key: "college", width: 30 },
            { header: "Branch", key: "branch", width: 16 },
            { header: "Year", key: "year", width: 10 },
            { header: "Technical Skills", key: "skills", width: 35 },
            { header: "GitHub Profile", key: "github", width: 32 },
            { header: "LinkedIn Profile", key: "linkedin", width: 32 },
            { header: "Application Date", key: "applicationDate", width: 22 },
            { header: "Status", key: "status", width: 16 },
            { header: "Resume URL", key: "resume", width: 45 },
            { header: "Why Join / Motivation", key: "motivation", width: 45 },
        ];

        // Format header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF2563EB" }, // Primary blue
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.height = 26;

        // Populate data rows
        applications.forEach((app) => {
            const skillsStr = Array.isArray(app.skills) ? app.skills.join(", ") : (app.skills || "");
            const dateStr = app.createdAt ? new Date(app.createdAt).toISOString().replace("T", " ").substring(0, 19) : "";

            let readableResumeUrl = app.resume || "";
            if (app.resumePublicId) {
                try {
                    readableResumeUrl = cloudinary.utils.private_download_url(
                        app.resumePublicId.replace(/\.pdf$/i, ""),
                        "pdf",
                        { resource_type: "image", type: "upload", attachment: false }
                    );
                } catch (e) {
                    readableResumeUrl = app.resume || "";
                }
            }

            const row = worksheet.addRow({
                name: app.name || "",
                email: app.email || "",
                phone: app.phone || "",
                position: app.domain || app.position || "",
                college: app.college || "",
                branch: app.branch || "",
                year: app.year || "",
                skills: skillsStr,
                github: app.github || "",
                linkedin: app.linkedin || "",
                applicationDate: dateStr,
                status: app.status || "",
                resume: readableResumeUrl,
                motivation: app.motivation || "",
            });

            row.alignment = { vertical: "middle" };
        });

        // Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`[Admin Career] Exported ${applications.length} applications to ${filename}`);

    } catch (error) {
        logger.error("[Admin Career] Excel export failed:", error);
        const err = new errorClass(false, 500, "Unable to export applications", "Excel export failed", error);
        next(err);
    }
};

/**
 * Stream applicant resume PDF directly to browser (bypasses Cloudinary raw ACL restrictions)
 */
export const viewApplicationResume = async (req, res, next) => {
    try {
        const { id } = req.params;
        const publicIdParam = req.query.publicId;

        let application = null;
        let publicId = publicIdParam || "";
        let resumeUrl = "";

        if (id) {
            application = await Application.findById(id);
            if (!application) {
                return res.status(404).send("Application not found");
            }
            resumeUrl = application.resume || "";
            publicId = application.resumePublicId || "";
        }

        if (!publicId && resumeUrl) {
            const match = resumeUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
            if (match) publicId = match[1];
        }

        if (!publicId && !resumeUrl) {
            return res.status(400).send("No resume reference found for this application");
        }

        // Try signed private download URL from Cloudinary
        const cleanId = publicId ? publicId.replace(/\.pdf$/i, "") : "";
        let privUrl = cloudinary.utils.private_download_url(cleanId, "pdf", {
            resource_type: "image",
            type: "upload",
            attachment: false
        });

        let cloudRes = await fetch(privUrl);

        if (cloudRes.status !== 200) {
            const rawId = publicId.endsWith(".pdf") ? publicId : `${publicId}.pdf`;
            privUrl = cloudinary.utils.private_download_url(rawId, "", {
                resource_type: "raw",
                type: "upload",
                attachment: false
            });
            cloudRes = await fetch(privUrl);
        }

        if (cloudRes.status !== 200 && resumeUrl) {
            cloudRes = await fetch(resumeUrl);
        }

        if (cloudRes.status !== 200) {
            logger.error(`[Resume View] Cloudinary returned status ${cloudRes.status}`);
            return res.status(cloudRes.status).send("Unable to load resume from Cloudinary");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="resume.pdf"');
        const arrayBuffer = await cloudRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));

    } catch (error) {
        logger.error("[Resume View] Error serving resume:", error);
        next(error);
    }
};

/**
 * Fetch system audit logs (additions, deletions, status changes, role changes, etc.)
 */
export const getAuditLogs = async (req, res, next) => {
    try {
        const { filter, limit = 100 } = req.query;
        const maxLimit = Math.min(parseInt(limit) || 100, 500);

        const logPath = path.resolve("./logs/combined.log");
        if (!fs.existsSync(logPath)) {
            return res.status(200).json({
                success: true,
                count: 0,
                logs: []
            });
        }

        const data = await fs.promises.readFile(logPath, "utf-8");
        let lines = data.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        if (filter) {
            const lowerFilter = filter.toLowerCase();
            lines = lines.filter(line => line.toLowerCase().includes(lowerFilter));
        }

        lines.reverse();
        const paginatedLines = lines.slice(0, maxLimit);

        return res.status(200).json({
            success: true,
            count: paginatedLines.length,
            totalFound: lines.length,
            logs: paginatedLines
        });
    } catch (error) {
        logger.error("[Audit Logs] Failed to read logs:", error);
        const err = new errorClass(false, 500, "Unable to read logs", "Log read failed", error);
        next(err);
    }
};
