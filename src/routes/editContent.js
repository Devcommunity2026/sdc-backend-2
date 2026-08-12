import express from "express";

import roleMiddleware from "../middlewares/roleMiddleware.js";

import {
    addEvent,
    deleteEvent,
    editEvent,

    addProject,
    deleteProject,
    editProject,

    addCoreTeamMember,
    removeCoreTeamMember,
    editCoreTeamMember,

    addMentor,
    removeMentor,
    editMentor,
    editApplication,

    addBlog,
    deleteBlog,
    editBlog
} from "../controllers/editContent.js";

import { imageParser } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(roleMiddleware(['moderator', 'admin']));


// ================= EVENT =================

router.post('/addEvent', imageParser.single('image'), addEvent);

router.post(
    '/removeEvent',
    deleteEvent
);

router.post(
    '/editEvent',
    imageParser.single('image'),
    editEvent
);


// ================= PROJECT =================

router.post(
    '/addProject',
    imageParser.single('image'),
    addProject
);

router.post(
    '/removeProject',
    deleteProject
);

router.post(
    '/editProject',
    imageParser.single('image'),
    editProject
);


// ================= CORE TEAM =================

router.post(
    '/addCoreTeamMember',
    imageParser.single('image'),
    addCoreTeamMember
);

router.post(
    '/removeCoreTeamMember',
    removeCoreTeamMember
);

router.post(
    '/editCoreTeamMember',
    imageParser.single('image'),
    editCoreTeamMember
);


// ================= MENTOR =================

router.post('/addMentor', imageParser.single('image'),
    addMentor
);

router.post(
    '/removeMentor',
    removeMentor
);

router.post(
    '/editMentor',
    imageParser.single('image'),
    editMentor
);


// ================= BLOG =================

router.post('/addBlog', imageParser.single('image'), addBlog);

router.post(
    '/removeBlog',
    deleteBlog
);

router.post(
    '/editBlog',
    imageParser.single('image'),
    editBlog
);


router.post('/application', editApplication)
export default router;
