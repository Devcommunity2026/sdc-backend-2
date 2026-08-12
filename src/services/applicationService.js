import Application from "../models/applicationSchema.js";
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
            `Application submitted by ${data.email}`
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

        await Application.findOneAndDelete({ _id: id });

        res.status(200).json({
            success: true,
            message: "Application Removed Successfully"
        });

        logger.info(
            `Application removed ${id}`
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
            await Application.countDocuments();

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

        const application = await Application.findOneAndUpdate(
            { _id: id },
            { $set: { status } },
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

        logger.info(
            `userId:${req.details.userId} | updated application ${id}`
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