import errorClass from '../utils/errorClass.js'
import logger from '../config/logger.js'
import { editDetailsByEmail } from '../services/userService.js'

function isLinkedInProfile(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.hostname.includes("linkedin.com") &&
            parsed.pathname.startsWith("/in/") &&
            parsed.pathname.split("/").filter(Boolean).length === 2
        );
    } catch (e) {
        return false;
    }
}

export function filterResponseData(details) {
    return {
        name: details.name,
        email: details.email,
        role: details.role,
        linkedIn: details.linkedIn,
        profileImage: details.profileImage,
        roleDescription: details.roleDescription,
        Position: details.Position,
    }
}

export const shareProfile = async (req, res, next) => {
    try {
        const details = req.details
        res.status(200).json(
            {
                success: true,
                data: filterResponseData(details)
            }
        )
        logger.info(`userId:${req.details.userId} | Details are shared`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable to share the Data', `userId:${req.details.userId} profile sharing failed`, error)
        next(err)
    }
}

export const editProfile = async (req, res, next) => {
    try {
        const details = req.details
        const reqData = req.body
        const toBeEdited = req.body.edit
        const editValue = req.body.value
        const canEdit = ['name', 'linkedIn', 'roleDescription']

        if (!toBeEdited in canEdit) {
            return res.status(400).json({
                success: false,
                message: `unable to edit ${toBeEdited}`
            });
        }

        if (toBeEdited == 'linkedIn' && !isLinkedInProfile(editValue)) {
            return res.status(400).json({
                success: false,
                message: `Please add correct fields`
            });
        }

        if (toBeEdited == 'roleDescription' && !details.roleDescription) {
            return res.status(400).json({
                success: false,
                message: `Initial Role Description are given By the Admin further you can edit`
            });
        }
        if (toBeEdited == 'roleDescription' && editValue.length > 200) {
            return res.status(400).json({
                success: false,
                message: `Description is to large`
            });
        }
        const query = await editDetailsByEmail(details.email, { [toBeEdited]: editValue })
        if (!query.success) {
            next(query.error)
        }
        console.log(query.data)
        res.status(200).json({
            success: true,
            data: filterResponseData(query.data)
        })

        logger.info(`userId:${req.details.toBeEdited} | ${toBeEdited} edited to ${editValue}`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable to edit the Data', `userId:${req.details.userId} Edit ${req.body.edit} failed`, error)
        next(err)
    }
}