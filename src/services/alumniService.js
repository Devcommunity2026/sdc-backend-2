import alumni from "../models/alumniSchema.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";

// ================= ADD ALUMNI =================
export const addAlumniData = async (
    data,
    req,
    res,
    next
) => {
    try {
        const newAlumni = new alumni({ ...data });
        await newAlumni.save();

        res.status(200).json({
            success: true,
            message: "Alumni Added Successfully",
            data: newAlumni
        });

        logger.info(
            `userId:${req.details?.userId || 'unknown'} | added alumni ${data.name}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Add Alumni",
            `userId:${req.details?.userId || 'unknown'} add alumni failed`,
            error
        );
        next(err);
    }
};

// ================= REMOVE ALUMNI =================
export const removeAlumniData = async (
    id,
    req,
    res,
    next
) => {
    try {
        const deleted = await alumni.findOneAndDelete({ _id: id });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Alumni not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alumni Removed Successfully"
        });

        logger.info(
            `userId:${req.details?.userId || 'unknown'} | removed alumni ${id}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Remove Alumni",
            `userId:${req.details?.userId || 'unknown'} remove alumni failed`,
            error
        );
        next(err);
    }
};

// ================= UPDATE ALUMNI =================
export const updateAlumniData = async (
    id,
    data,
    req,
    res,
    next
) => {
    try {
        const updated = await alumni.findByIdAndUpdate(id, data, { new: true, runValidators: true });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Alumni not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alumni Updated Successfully",
            data: updated
        });

        logger.info(
            `userId:${req.details?.userId || 'unknown'} | updated alumni ${id}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Alumni",
            `userId:${req.details?.userId || 'unknown'} edit alumni failed`,
            error
        );
        next(err);
    }
};

// ================= GET SORTED ALUMNI =================
export const getSortedAlumni = async (page, limit) => {
    try {
        const totalAlumni = await alumni.countDocuments();
        let query = alumni.find().sort({ passingYear: 1, name: 1, company: 1 });

        if (page && limit) {
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 10;
            const skip = (pageNum - 1) * limitNum;

            const alumniList = await query.skip(skip).limit(limitNum);

            return {
                success: true,
                data: alumniList,
                pagination: {
                    total: totalAlumni,
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalAlumni / limitNum) || 1,
                    limit: limitNum
                }
            };
        }

        const alumniList = await query;
        return {
            success: true,
            data: alumniList,
            pagination: {
                total: totalAlumni,
                currentPage: 1,
                totalPages: 1,
                limit: totalAlumni
            }
        };
    } catch (error) {
        return {
            success: false,
            error
        };
    }
};

// ================= GET ALUMNI BY ID =================
export const getAlumniById = async (id) => {
    try {
        const singleAlumni = await alumni.findById(id);
        if (!singleAlumni) {
            return {
                success: false,
                notFound: true,
                message: "Alumni not found"
            };
        }
        return {
            success: true,
            data: singleAlumni
        };
    } catch (error) {
        return {
            success: false,
            error
        };
    }
};

// ================= COUNT ALUMNI =================
export const getAlumniCount = async () => {
    try {
        return await alumni.countDocuments();
    } catch (error) {
        return null;
    }
};
