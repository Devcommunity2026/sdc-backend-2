import errorClass from '../utils/errorClass.js'
import { getUserDetailsByEmail, editDetailsByEmail } from '../services/userService.js'
import { filterResponseData } from './profileController.js'
import logger from '../config/logger.js'
import User from '../models/userSchema.js'

export const getAccess = (req, res, next) => {
    try {
        const details = req.details
        res.status(200).json({
            success: true,
            message: 'access provided'
        })
        logger.info(`userId:${req.details.userId} | Admin page access granted`)
    } catch (error) {
        logger.info(`userId:${req.details.userId} | Admin page access Denied`)

        const err = new errorClass(false, 500, 'Something went wrong', `userId:${req.details.userId} Admin page access  failed`, error)
        next(err)
    }
}

export const editRole = async (req, res, next) => {
    try {
        const details = req.details
        const role = req.body.role
        const email = req.body.email

        if (!(["admin", "moderator", "user"].includes(role))) {
            return res.status(400).json({
                success: false,
                message: "Invalid Input"
            });
        }

        logger.info(email)

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "please Enter Valid Input"
            });
        }

        if (email === process.env.OWNER_EMAIL) {
            logger.info(`userId:${req.details.userId} | Try to edit owner role`);

            return res.json({
                success: false,
                message: "You are not allowed to modify the owner account"
            });
        }


        const updatedData = await editDetailsByEmail(email, {
            role: role,
            roleDescription: ""
        })

        if (!updatedData.success) {
            return next(updatedData.error)
        }

        if (!updatedData.data) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        res.status(200).json({
            success: true,
            message: 'User Role Updated'
        })

        logger.info(`userId:${req.details.userId} | Edited the role of ${email} to ${role}`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Something went wrong', `userId:${req.details.userId} role edit failed`, error)
        next(err)
    }
}

export const banEdit = async (req, res, next) => {
    try {
        const details = req.details
        const email = req.body.email
        const operation = req.body.operation


        if (!email || !operation || !["add", "remove"].includes(operation)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Input"
            });
        }
        if (email === process.env.OWNER_EMAIL) {
            logger.info(`userId:${req.details.userId} | Try to Ban the  owner`)
            return res.status(400).json({
                success: false,
                message: "something went wrong"
            });
        }
        const updatedData = await editDetailsByEmail(email, {
            isBanned: operation === "add"
        })

        if (!updatedData.success) {
            next(updatedData.error)
        }

        if (!updatedData.data) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Ban of user is ${operation}ed`
        })

        logger.info(`userId:${req.details.userId} |  ${operation}ed ban of ${email}`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Something went wrong', `userId:${req.details.userId} Ban edit failed`, error)
        next(err)
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email"
            });
        }

        if (req.details.email !== process.env.OWNER_EMAIL) {
            logger.info(`userId:${req.details.userId} | Unauthorized attempt to delete user (not owner)`)
            return res.status(403).json({
                success: false,
                message: "Only the owner is authorized to delete user accounts"
            });
        }

        if (email === process.env.OWNER_EMAIL) {
            logger.info(`userId:${req.details.userId} | Tried to delete the owner account`)
            return res.status(400).json({
                success: false,
                message: "You are not allowed to delete the owner account"
            });
        }

        const deletedUser = await User.findOneAndDelete({ email })

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        })

        logger.info(`userId:${req.details.userId} | Deleted user ${email} (userId:${deletedUser.userId})`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Something went wrong', `userId:${req.details.userId} Delete user failed`, error)
        next(err)
    }
}
// New controller: return all users sorted by role hierarchy and name
export const getSortedUsers = async (req, res, next) => {
    try {
        // Fetch all users
        const users = await User.find({});
        const roleOrder = {
            admin: 1,
            moderator: 2,
            user: 3,
            team: 4,
            mentor: 5,
        };
        // Sort by role weight then name
        users.sort((a, b) => {
            const roleA = roleOrder[a.role] || 99;
            const roleB = roleOrder[b.role] || 99;
            if (roleA !== roleB) return roleA - roleB;
            return a.name.localeCompare(b.name);
        });
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable to fetch sorted users',
            `fetch sorted users failed`,
            error
        );
        next(err);
    }
};
