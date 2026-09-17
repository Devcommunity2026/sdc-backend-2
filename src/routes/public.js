import express from "express";
import { getUsers, getTeam, getMentor, getAlumni, getEvents, getProjects, getCount, getBlogs, getPublicRegistrationStatus } from "../controllers/publicController.js";
import { sendCareerOtp, resendCareerOtp, verifyCareerOtp, uploadResume, submitCareerApplication } from "../controllers/careerController.js";
import { resumeParser } from "../middlewares/uploadMiddleware.js";
import { viewApplicationResume } from "../controllers/careerAdminController.js";

const router = express.Router()

router.get('/stats', getCount)
router.get('/event', getEvents);
router.get('/team', getTeam);
router.get('/mentor', getMentor);
router.get('/alumni', getAlumni);
router.get('/project', getProjects);
router.get('/blog', getBlogs);
router.get('/registration-status', getPublicRegistrationStatus);

// Career application & OTP verification routes
router.post('/career/send-otp', sendCareerOtp);
router.post('/career/resend-otp', resendCareerOtp);
router.post('/career/verify-otp', verifyCareerOtp);
router.post('/career/upload-resume', resumeParser.single('resume'), uploadResume);
router.get('/career/resume-preview', viewApplicationResume);
router.get('/career/resume/:id', viewApplicationResume);
router.post('/apply', submitCareerApplication);

export default router