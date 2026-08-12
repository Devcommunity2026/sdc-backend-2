import errorClass from "../utils/errorClass.js";
import User from "../models/userSchema.js";
import { getMentorCount } from "./mentorService.js";
import { getMemberCount } from "./coreTeamService.js";

export const getUsesCount = async () => {
    try {
        const totalUsers = await User.countDocuments();
        return totalUsers
    } catch (error) {
        return null
    }
}

export const getUserDetailsByEmail = async (email) => {
    try {
        const details = await User.findOne({
            email: email
        })
        return {
            success: true,
            data: details
        }
    } catch (error) {
        const err = new errorClass(false, 500, 'Something went wrong', `email:${email} Query Failed`, error)
        return {
            success: false,
            data: null,
            error: err
        }
    }
}

export const editDetailsByEmail = async (email, obj) => {
    try {
        const details = await User.findOneAndUpdate(
            { email: email },
            { $set: obj },
            { new: true }
        )
        return {
            success: true,
            data: details
        }
    } catch (error) {
        const err = new errorClass(false, 500, 'Something went wrong', `email:${email} Update Failed`, error)
        return {
            success: false,
            data: null,
            error: err
        }
    }
}

export const getPaginatedUsers = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        const users = await User.aggregate([
            {
                $addFields: {
                    rolePriority: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$role", "admin"] }, then: 1 },
                                { case: { $eq: ["$role", "moderator"] }, then: 2 },
                                { case: { $eq: ["$role", "mentor"] }, then: 3 },
                                { case: { $eq: ["$role", "team"] }, then: 4 },
                                { case: { $eq: ["$role", "user"] }, then: 5 }
                            ],
                            default: 6
                        }
                    }
                }
            },
            {
                $sort: {
                    rolePriority: 1,
                    createdAt: -1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $project: {
                    password: 0,
                    rolePriority: 0
                }
            }
        ]);

        const totalUsers = await User.countDocuments();

        return {
            success: true,
            data: users,
            pagination: {
                total: totalUsers,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                limit
            }
        };

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Something went wrong",
            "Failed to fetch paginated users",
            error
        );

        return {
            success: false,
            data: null,
            error: err
        };
    }
};

export const getStatsCounts = async () => {
    const userCount = await getUsesCount();
    const mentorCount = await getMentorCount();
    const memberCount = await getMemberCount();
    return {
        users: userCount,
        mentors: mentorCount,
        members: memberCount
    };
};