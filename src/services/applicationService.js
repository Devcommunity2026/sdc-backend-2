import mongoose from "mongoose";
import Application from "../models/applicationSchema.js";
import cloudinary from "../config/cloudConfig.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";


// ================= ADD APPLICATION =================

export const addApplicationData = async (data) => {
    try {

        const existingApplication = await Application.findOne({
            email: data.email
        });

        if (existingApplication) {
            return {
                success: false,
                error: new errorClass(
                    false,
                    409,
                    "Application with this email already exists",
                    "Duplicate application"
                    , new Error('duplicate User')
                )
            };
        }

        const formattedSkills = data.skills
            ?.split(",")
            .map((skill) => skill.trim());

        const application = new Application({
            ...data,
            skills: formattedSkills
        });

        await application.save();

        logger.info(
            `[ADDITION] Application submitted by ${data.email} | Name: ${data.name} | Domain: ${data.domain} | ID: ${application._id}`
        );

        return {
            success: true,
            message: "Application Submitted Successfully",
            data: application
        };

    } catch (error) {

        return {
            success: false,
            error: new errorClass(
                false,
                500,
                "Unable To Submit Application",
                "Application submit failed",
                error
            )
        };
    }
};


// ================= REMOVE APPLICATION =================

export const removeApplicationData = async (
    id,
    req,
    res,
    next
) => {

    try {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid Application ID is required"
            });
        }

        const appToDelete = await Application.findById(id);
        if (!appToDelete) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        let publicId = appToDelete.resumePublicId;
        if (!publicId && appToDelete.resume && typeof appToDelete.resume === "string" && appToDelete.resume.includes("cloudinary.com")) {
            const match = appToDelete.resume.match(/(?:image|raw)\/upload\/(?:v\d+\/)?(resume\/[^.?#]+)/);
            if (match && match[1]) {
                publicId = match[1];
            }
        }

        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
                await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
            } catch (cloudErr) {
                logger.warn(`[Career Application] Could not clean up Cloudinary asset ${publicId}:`, cloudErr);
            }
        }

        await Application.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Application Removed Successfully",
            id
        });

        const operator = req?.details?.email ? `${req.details.email} (role: ${req.details.role || 'unknown'}, id: ${req.details.userId || req.details._id})` : `userId:${req?.details?.userId || 'unknown'}`;
        logger.info(
            `[DELETION] Application ${id} (${appToDelete.name} | ${appToDelete.email}) removed by ${operator}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Remove Application",
            `Application remove failed`,
            error
        );

        next(err);
    }
};


// ================= GET APPLICATION COUNT =================

export const getApplicationCount = async () => {

    try {

        const totalApplications =
            await Application.countDocuments();

        return totalApplications;

    } catch (error) {

        return null;
    }
};


// ================= GET PAGINATED APPLICATIONS =================

export const getPaginatedApplications = async (page = 1, limit = 10, queryObject) => {

    try {

        const skip = (page - 1) * limit;

        const applications = await Application.find(queryObject)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalApplications =
            await Application.countDocuments(queryObject);

        const totalPages = Math.ceil(
            totalApplications / limit
        );

        return {
            success: true,

            data: applications,

            pagination: {
                currentPage: page,
                totalPages,
                totalApplications,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };

    } catch (error) {

        return {
            success: false,
            error
        };
    }
};


// ================= GET SINGLE APPLICATION =================

export const getSingleApplication = async (id) => {

    try {

        const application = await Application.findById(id);

        if (!application) {

            return {
                success: false,
                message: "Application Not Found"
            };
        }

        return {
            success: true,
            data: application
        };

    } catch (error) {

        return {
            success: false,
            error
        };
    }
};


export const updateApplication = async (
    id,
    status,
    req,
    res,
    next
) => {

    try {
        const upper = status ? status.toUpperCase().replace(/\s+/g, "_") : "ON_HOLD";
        const finalStatus = ["ON_HOLD", "SELECTED", "REJECTED"].includes(upper) ? upper : status;

        const application = await Application.findOneAndUpdate(
            { _id: id },
            { $set: { status: finalStatus } },
            { new: true }
        );

        if (!application) {

            return res.status(404).json({
                success: false,
                message: "Application Not Found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Application Updated Successfully",
            data: application
        });

        const operator = req?.details?.email ? `${req.details.email} (role: ${req.details.role || 'unknown'}, id: ${req.details.userId || req.details._id})` : `userId:${req?.details?.userId || 'unknown'}`;
        logger.info(
            `[STATUS UPDATE] Application ${id} (${application.name} | ${application.email}) status updated to ${finalStatus} by ${operator}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Update Application",
            `userId:${req.details.userId} update application failed`,
            error
        );

        next(err);
    }
};