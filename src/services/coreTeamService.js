import coreTeam from "../models/coreTeamSchema.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";


// ================= ADD CORE TEAM MEMBER =================

export const addCoreTeamMemberData = async (
    data,
    req,
    res,
    next
) => {

    try {

        // LIMIT CHECK
        const totalMembers = await coreTeam.countDocuments();

        if (totalMembers >= process.env.TEAM_SIZE) {
            return res.status(400).json({
                success: false,
                message: "Core team cannot have more than 12 members"
            });
        }

        const TeamMember = new coreTeam({ ...data });

        await TeamMember.save();

        res.status(200).json({
            success: true,
            message: "Core Team Member Added Successfully"
        });

        logger.info(
            `userId:${req.details.userId} | added core team member ${data.name}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Add Core Team Member",
            `userId:${req.details.userId} add core team member failed`,
            error
        );

        next(err);
    }
};


// ================= REMOVE CORE TEAM MEMBER =================

export const removeCoreTeamMemberData = async (
    id,
    req,
    res,
    next
) => {

    try {

        await coreTeam.findOneAndDelete({ _id: id });

        res.status(200).json({
            success: true,
            message: "Core Team Member Removed Successfully"
        });

        logger.info(
            `userId:${req.details.userId} | removed core team member ${id}`
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Remove Core Team Member",
            `userId:${req.details.userId} remove core team member failed`,
            error
        );

        next(err);
    }
};

export const getMemberCount = async () => {
    try {
        const totalCoreTeam = await coreTeam.countDocuments();
        return totalCoreTeam

    } catch (error) {
        return null
    }
}

export const getPaginatedTeam = async () => {
    try {

        const CoreTeam = await coreTeam.find().sort({ name: 1 });

        return {
            success: true,
            data: CoreTeam
        };

    } catch (error) {

        return {
            success: false,
            error: error
        };
    }
};

export const updateCoreTeamMemberData = async (id, data, req, res, next) => {
    try {
        await coreTeam.findByIdAndUpdate(id, data, { new: true });
        res.status(200).json({
            success: true,
            message: "Core Team Member Updated Successfully"
        });
        logger.info(
            `userId:${req.details.userId} | updated core team member ${id}`
        );
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Core Team Member",
            `userId:${req.details.userId} edit core team member failed`,
            error
        );
        next(err);
    }
};