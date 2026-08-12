import mongoose from "mongoose";
import errorClass from "../utils/errorClass.js";
import {
    addCoreTeamMemberData,
    removeCoreTeamMemberData,
    updateCoreTeamMemberData
} from "../services/coreTeamService.js";

import {
    addMentorData,
    removeMentorData,
    updateMentorData
} from "../services/mentorService.js";

import {
    addEventData,
    deleteEventData,
    editEventData
} from "../services/eventService.js";

import {
    addProjectData,
    deleteProjectData,
    editProjectData
} from "../services/projectService.js";

import {
    addBlogData,
    deleteBlogData,
    editBlogData
} from "../services/blogService.js";

import { updateApplication } from '../services/applicationService.js'

// ================= ADD EVENT =================

export const addEvent = async (req, res, next) => {
    try {

        const userData = req.body;

        const data = {
            name: userData.name,
            subHeading: userData.subHeading,
            description: userData.description,
            date: new Date(userData.date),
            form: userData.form,
            thumbnail: req.file.path
        };

        return await addEventData(data, req, res, next);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Add Event',
            `userId:${req.details.userId} add Event failed`,
            error
        );

        next(err);
    }
};


// ================= DELETE EVENT =================

export const deleteEvent = async (req, res, next) => {
    try {

        return await deleteEventData(
            req.body.id,
            req,
            res,
            next
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Delete Event',
            `userId:${req.details.userId} delete Event failed`,
            error
        );

        next(err);
    }
};


// ================= ADD PROJECT =================

export const addProject = async (req, res, next) => {
    try {

        const userData = req.body;

        const data = {
            name: userData.name,
            subHeading: userData.subHeading,
            description: userData.description,
            live: userData.live,
            techStack: JSON.parse(userData.techStack),
            thumbnail: req.file.path
        };

        return await addProjectData(data, req, res, next);

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Add Project',
            `userId:${req.details.userId} add Project failed`,
            error
        );

        next(err);
    }
};


// ================= DELETE PROJECT =================

export const deleteProject = async (req, res, next) => {
    try {

        return await deleteProjectData(
            req.body.id,
            req,
            res,
            next
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            'Unable To Delete Project',
            `userId:${req.details.userId} delete Project failed`,
            error
        );

        next(err);
    }
};

// ================= ADD CORE TEAM MEMBER =================

export const addCoreTeamMember = async (
    req,
    res,
    next
) => {

    try {

        const userData = req.body;

        const data = {
            name: userData.name,
            post: userData.post,
            linkedin: userData.linkedin,
            image: req.file.path
        };
        return await addCoreTeamMemberData(
            data,
            req,
            res,
            next
        );

    } catch (error) {

        const err = new errorClass(
            false,
            500,
            "Unable To Add Core Team Member",
            `userId:${req.details.userId} add core team member failed`,
            error
        );
        console.log(err)

        next(err);
    }
};


// ================= REMOVE CORE TEAM MEMBER =================

export const removeCoreTeamMember = async (
    req,
    res,
    next
) => {

    try {

        return await removeCoreTeamMemberData(
            req.body.id,
            req,
            res,
            next
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

// ================= ADD MENTOR =================

export const addMentor = async (
    req,
    res,
    next
) => {

    try {

        const userData = req.body;

        const data = {
            name: userData.name,
            description: userData.description,
            linkedin: userData.linkedin,
            image: req.file.path
        };

        return await addMentorData(
            data,
            req,
            res,
            next
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

export const removeMentor = async (
    req,
    res,
    next
) => {

    try {

        return await removeMentorData(
            req.body.id,
            req,
            res,
            next
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


// ================Application======================
export const editApplication = async (req, res, next) => {
    try {
        const id = req.body.id
        const status = req.body.status
        return await updateApplication(id, status, req, res, next)
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Application",
            `userId:${req.details.userId} edit application failed`,
            error
        );

        next(err);
    }
}

// ================= ADD BLOG =================

export const addBlog = async (req, res, next) => {
    try {
        const userData = req.body;

        const data = {
            title: userData.title,
            subHeading: userData.subHeading,
            subtitle: userData.subtitle || userData.subHeading,
            description: userData.description,
            formattedContent: userData.formattedContent || userData.description,
            author: userData.author,
            readTime: userData.readTime || "5 min read",
            tags: userData.tags ? userData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
            date: userData.date ? new Date(userData.date) : new Date(),
            createdAt: new Date(),
            thumbnail: req.file.path
        };

        return await addBlogData(data, req, res, next);

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Add Blog',
            `userId:${req.details.userId} add Blog failed`,
            error
        );

        next(err);
    }
};


// ================= DELETE BLOG =================

export const deleteBlog = async (req, res, next) => {
    try {
        return await deleteBlogData(
            req.body.id,
            req,
            res,
            next
        );

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Delete Blog',
            `userId:${req.details.userId} delete Blog failed`,
            error
        );

        next(err);
    }
};

// ================= EDIT BLOG =================

export const editBlog = async (req, res, next) => {
    try {
        const userData = req.body;
        const id = userData.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid blog ID is required" });
        }

        const title = userData.title?.trim();
        const subHeading = userData.subHeading?.trim();
        const description = userData.description?.trim();
        const author = userData.author?.trim();
        const readTime = userData.readTime?.trim();

        if (!title || !subHeading || !description || !author || !readTime) {
            return res.status(400).json({
                success: false,
                message: "Title, sub heading, content, author, and read time are required"
            });
        }

        const data = {
            title,
            subHeading,
            subtitle: userData.subtitle?.trim() || subHeading,
            description,
            formattedContent: userData.formattedContent || description,
            author,
            readTime,
            tags: userData.tags ? userData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        };

        if (userData.date) {
            const parsedDate = new Date(userData.date);
            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({ success: false, message: "Valid blog date is required" });
            }
            data.date = parsedDate;
        }

        if (req.file) {
            data.thumbnail = req.file.path;
        }

        return await editBlogData(id, data, req, res, next);

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Edit Blog',
            `userId:${req.details.userId} edit Blog failed`,
            error
        );

        next(err);
    }
};

// ================= EDIT EVENT =================
export const editEvent = async (req, res, next) => {
    try {
        const userData = req.body;
        const id = userData.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }
        const data = {
            name: userData.name,
            subHeading: userData.subHeading,
            description: userData.description,
            date: new Date(userData.date),
            form: userData.form,
        };
        if (req.file) {
            data.thumbnail = req.file.path;
        }
        return await editEventData(id, data, req, res, next);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Edit Event',
            `userId:${req.details.userId} edit Event failed`,
            error
        );
        next(err);
    }
};

// ================= EDIT PROJECT =================
export const editProject = async (req, res, next) => {
    try {
        const userData = req.body;
        const id = userData.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }
        const data = {
            name: userData.name,
            subHeading: userData.subHeading,
            description: userData.description,
            live: userData.live,
            techStack: JSON.parse(userData.techStack),
        };
        if (req.file) {
            data.thumbnail = req.file.path;
        }
        return await editProjectData(id, data, req, res, next);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            'Unable To Edit Project',
            `userId:${req.details.userId} edit Project failed`,
            error
        );
        next(err);
    }
};

// ================= EDIT CORE TEAM MEMBER =================
export const editCoreTeamMember = async (req, res, next) => {
    try {
        const userData = req.body;
        const id = userData.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }
        const data = {
            name: userData.name,
            post: userData.post,
            linkedin: userData.linkedin,
        };
        if (req.file) {
            data.image = req.file.path;
        }
        return await updateCoreTeamMemberData(id, data, req, res, next);
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

// ================= EDIT MENTOR =================
export const editMentor = async (req, res, next) => {
    try {
        const userData = req.body;
        const id = userData.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }
        const data = {
            name: userData.name,
            description: userData.description,
            linkedin: userData.linkedin,
        };
        if (req.file) {
            data.image = req.file.path;
        }
        return await updateMentorData(id, data, req, res, next);
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
