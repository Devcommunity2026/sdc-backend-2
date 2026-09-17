import mentor from "../models/mentorSchema.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";


// ================= ADD MENTOR =================

export const addMentorData = async (
    data,
    req,
    res,
    next
) => {

    try {

        const Mentor = new mentor({ ...data });

        await Mentor.save();

        res.status(200).json({
            success: true,
            message: "Mentor Added Successfully"
        });

        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'unknown'}, id: ${req.details.userId || req.details._id})` : `userId:${req.details?.userId || 'unknown'}`;
        logger.info(
            `[ADDITION] Mentor "${data.name}" added by ${operator} | Mentor ID: ${Mentor._id}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Add Mentor",
            `userId:${req.details?.userId} add mentor failed`,
            error
        );

        next(err);
    }
};


// ================= REMOVE MENTOR =================

export const removeMentorData = async (
    id,
    req,
    res,
    next
) => {

    try {

        await mentor.findOneAndDelete({ _id: id });

        res.status(200).json({
            success: true,
            message: "Mentor Removed Successfully"
        });

        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'unknown'}, id: ${req.details.userId || req.details._id})` : `userId:${req.details?.userId || 'unknown'}`;
        logger.info(
            `[DELETION] Mentor ${id} removed by ${operator}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Remove Mentor",
            `userId:${req.details?.userId} remove mentor failed`,
            error
        );

        next(err);
    }
};

export const getMentorCount = async () => {
    try {
        const totalMentors = await mentor.countDocuments();
        return totalMentors

    } catch (error) {
        return null
    }
}

export const getPaginatedMentor = async (page = 1, limit = 10) => {
    try {

        const skip = (page - 1) * limit;

        const mentors = await mentor.find()
            .skip(skip)
            .limit(limit)
            .sort({ cardPosition: 1 });

        const totalMentors = await mentor.countDocuments();

        return {
            success: true,
            data: mentors,
            pagination: {
                total: totalMentors,
                currentPage: page,
                totalPages: Math.ceil(totalMentors / limit),
                limit
            }
        };

    } catch (error) {

        return {
            success: false,
            error: error
        };
    }
};

export const updateMentorData = async (id, data, req, res, next) => {
    try {
        await mentor.findByIdAndUpdate(id, data, { new: true });
        res.status(200).json({
            success: true,
            message: "Mentor Updated Successfully"
        });
        const operator = req.details?.email ? `${req.details.email} (role: ${req.details.role || 'unknown'}, id: ${req.details.userId || req.details._id})` : `userId:${req.details?.userId || 'unknown'}`;
        logger.info(
            `[UPDATE] Mentor ${id} updated by ${operator}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Mentor",
            `userId:${req.details?.userId} edit mentor failed`,
            error
        );
        next(err);
    }
};