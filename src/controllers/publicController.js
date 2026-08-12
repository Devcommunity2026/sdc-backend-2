import { getUsesCount } from "../services/userService.js";
import { getMentorCount, getPaginatedMentor } from "../services/mentorService.js";
import { getMemberCount } from "../services/coreTeamService.js";
import { getPaginatedUsers } from "../services/userService.js";
import { getPaginatedTeam } from "../services/coreTeamService.js"
import { getPaginatedProjects } from "../services/projectService.js";
import { getPaginatedEvents } from "../services/eventService.js";
import { getPaginatedBlogs } from "../services/blogService.js";
import { addApplicationData } from "../services/applicationService.js";
import Setting from "../models/settingSchema.js";
import errorClass from "../utils/errorClass.js";


export const handelApply = async (req, res, next) => {
    try {

        const result = await addApplicationData(req.body);

        if (!result.success) {
            return next(result.error);
        }

        res.status(201).json(result);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Submit Application",
            "Application submit failed",
            error
        );

        next(err);
    }
};

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
            `user get Count failed`,
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
            `user fetch users failed`,
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
            `user fetch Team failed`,
            error
        );

        next(err);
    }
};

export const getMentor = async (req, res, next) => {
    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await getPaginatedMentor(page, limit);

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Fetch Mentor',
            'user fetch Mentor failed',
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
            `user fetch users failed`,
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
            `user fetch users failed`,
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
            `user fetch blogs failed`,
            error
        );

        next(err);
    }
};

export const getPublicRegistrationStatus = async (req, res, next) => {
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
            `fetch registration status failed`,
            error
        );

        next(err);
    }
};