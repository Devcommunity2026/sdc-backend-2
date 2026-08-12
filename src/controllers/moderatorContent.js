import { getUsesCount } from "../services/userService.js";
import { getMentorCount } from "../services/mentorService.js";
import { getMemberCount } from "../services/coreTeamService.js";
import { getPaginatedUsers } from "../services/userService.js";
import { getPaginatedTeam } from "../services/coreTeamService.js"
import { getPaginatedMentor } from "../services/mentorService.js"
import { getPaginatedProjects } from "../services/projectService.js";
import { getPaginatedEvents } from "../services/eventService.js";
import { getPaginatedBlogs } from "../services/blogService.js";
import { getPaginatedApplications } from "../services/applicationService.js";
import Setting from "../models/settingSchema.js";
import errorClass from "../utils/errorClass.js";
import { Query } from "mongoose";
import logger from "../config/logger.js";

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

export const getCount = async (req, res, next) => {
    try {
        const userCount = await getUsesCount();
        const mentorCount = await getMentorCount();
        const memberCount = await getMemberCount();

        res.status(200).json({
            success: true,
            data: {
                users: userCount,
                mentors: mentorCount,
                members: memberCount
            }
        });

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Count',
            `userId:${req.details.userId} get Count failed`,
            error
        );

        next(err);
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await getPaginatedUsers(page, limit);

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Users',
            `userId:${req.details.userId} fetch users failed`,
            error
        );

        next(err);
    }
};

export const getTeam = async (req, res, next) => {
    try {

        const result = await getPaginatedTeam();

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Team',
            `userId:${req.details.userId} fetch Team failed`,
            error
        );

        next(err);
    }
};

export const getMentor = async (req, res, next) => {
    try {

        const result = await getPaginatedMentor();

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Mentor',
            `userId:${req.details.userId} fetch Mentor failed`,
            error
        );

        next(err);
    }
};

export const getEvents = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await getPaginatedEvents(page, limit);

        if (!result.success) {
            return next(result.error);
        }
        res.status(200).json(result);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Events',
            `userId:${req.details.userId} fetch users failed`,
            error
        );

        next(err);
    }
}

export const getProjects = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await getPaginatedProjects(page, limit);

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Users',
            `userId:${req.details.userId} fetch users failed`,
            error
        );

        next(err);
    }
};

export const getApplication = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const domain = req.query.domain || "All";
        const status = req.query.status || "Applied";

        const validDomains = [
            "All",
            "Web Development",
            "AI / Machine Learning",
            "Cybersecurity",
            "Mobile App Development",
            "Open Source"
        ];

        if (!validDomains.includes(domain)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Input"
            });
        }

        const queryObject = {};

        queryObject.status = status;

        if (domain !== "All") {
            queryObject.domain = domain;
        }

        const result = await getPaginatedApplications(
            page,
            limit,
            queryObject
        );

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Fetch Applications",
            `userId:${req.details.userId} fetch Applications failed`,
            error
        );

        next(err);
    }
};

export const getBlogs = async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await getPaginatedBlogs(page, limit);

        if (!result.success) {
            return next(result.error);
        }
        res.status(200).json(result);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Blogs',
            `userId:${req.details.userId} fetch blogs failed`,
            error
        );

        next(err);
    }
};

export const getRegistrationStatus = async (req, res, next) => {
    try {
        const setting = await Setting.findOne({ key: "registrationOpen" });
        const isOpen = setting ? setting.value : true;

        res.status(200).json({
            success: true,
            registrationOpen: isOpen
        });
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Registration Status',
            `userId:${req.details.userId} fetch registration status failed`,
            error
        );

        next(err);
    }
};

export const setRegistrationStatus = async (req, res, next) => {
    try {
        const { open } = req.body;
        
        await Setting.findOneAndUpdate(
            { key: "registrationOpen" },
            { value: open },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: `Registration turned ${open ? "ON" : "OFF"} successfully`
        });
        
        logger.info(`userId:${req.details.userId} | updated registrationOpen to ${open}`);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Update Registration Status',
            `userId:${req.details.userId} update registration status failed`,
            error
        );

        next(err);
    }
};