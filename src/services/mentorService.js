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

        logger.info(
            `userId:${req.details.userId} | added mentor ${data.name}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Add Mentor",
            `userId:${req.details.userId} add mentor failed`,
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

        logger.info(
            `userId:${req.details.userId} | removed mentor ${id}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Remove Mentor",
            `userId:${req.details.userId} remove mentor failed`,
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
        logger.info(
            `userId:${req.details.userId} | updated mentor ${id}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Mentor",
            `userId:${req.details.userId} edit mentor failed`,
            error
        );
        next(err);
    }
};