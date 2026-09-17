import jwt from "jsonwebtoken";
import Application from "../models/applicationSchema.js";
import Setting from "../models/settingSchema.js";
import { sendCareerOtpEmail } from "../services/mailService.js";
import store from "../utils/memoryStore.js";
import logger from "../config/logger.js";
import errorClass from "../utils/errorClass.js";
import cloudinary from "../config/cloudConfig.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send OTP to career applicant email
 */
export const sendCareerOtp = async (req, res, next) => {
    try {
        const { email, name } = req.body;

        if (!email || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "A valid email address is required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        if (!cleanEmail.endsWith("@medicaps.ac.in")) {
            return res.status(400).json({
                success: false,
                message: "Only @medicaps.ac.in college email addresses are eligible to apply"
            });
        }

        // Check if registration is open globally
        const setting = await Setting.findOne({ key: "registrationOpen" });
        if (setting && setting.value === false) {
            return res.status(403).json({
                success: false,
                message: "Career registrations are currently closed"
            });
        }

        // Check if application already exists for this email
        const existingApp = await Application.findOne({ email: cleanEmail });
        if (existingApp) {
            return res.status(409).json({
                success: false,
                message: "An application with this email already exists"
            });
        }

        // Cooldown check: 60 seconds rate limit
        const existingOtpData = store.careerOtp.get(cleanEmail);
        if (existingOtpData && (Date.now() - existingOtpData.lastSentAt) < 60 * 1000) {
            const secondsLeft = Math.ceil((60 * 1000 - (Date.now() - existingOtpData.lastSentAt)) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${secondsLeft} seconds before requesting a new OTP`
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        await sendCareerOtpEmail(cleanEmail, name, otp);

        store.careerOtp.set(cleanEmail, {
            otp,
            name: name ? name.trim() : "",
            createdAt: Date.now(),
            lastSentAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
            attempts: 0
        });

        logger.info(`[Career OTP] OTP sent to ${cleanEmail}`);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your email"
        });

    } catch (error) {
        logger.error("[Career OTP] Error in sendCareerOtp:", error);
        const err = new errorClass(false, 500, "Unable to send OTP", "Career OTP send failed", error);
        next(err);
    }
};

/**
 * Resend OTP to career applicant email
 */
export const resendCareerOtp = async (req, res, next) => {
    try {
        const { email, name } = req.body;

        if (!email || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "A valid email address is required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        if (!cleanEmail.endsWith("@medicaps.ac.in")) {
            return res.status(400).json({
                success: false,
                message: "Only @medicaps.ac.in college email addresses are eligible to apply"
            });
        }

        // Check if registration is open globally
        const setting = await Setting.findOne({ key: "registrationOpen" });
        if (setting && setting.value === false) {
            return res.status(403).json({
                success: false,
                message: "Career registrations are currently closed"
            });
        }

        const existingOtpData = store.careerOtp.get(cleanEmail);
        if (existingOtpData && (Date.now() - existingOtpData.lastSentAt) < 60 * 1000) {
            const secondsLeft = Math.ceil((60 * 1000 - (Date.now() - existingOtpData.lastSentAt)) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${secondsLeft} seconds before resending OTP`
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const applicantName = name ? name.trim() : (existingOtpData?.name || "");

        await sendCareerOtpEmail(cleanEmail, applicantName, otp);

        store.careerOtp.set(cleanEmail, {
            otp,
            name: applicantName,
            createdAt: Date.now(),
            lastSentAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
            attempts: 0
        });

        logger.info(`[Career OTP] OTP resent to ${cleanEmail}`);

        return res.status(200).json({
            success: true,
            message: "OTP resent successfully to your email"
        });

    } catch (error) {
        logger.error("[Career OTP] Error in resendCareerOtp:", error);
        const err = new errorClass(false, 500, "Unable to resend OTP", "Career OTP resend failed", error);
        next(err);
    }
};

/**
 * Verify applicant OTP and issue single-use verification token
 */
export const verifyCareerOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const storedData = store.careerOtp.get(cleanEmail);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: "No active OTP request found. Please request an OTP first."
            });
        }

        if (storedData.expiresAt < Date.now()) {
            store.careerOtp.delete(cleanEmail);
            return res.status(401).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        if (storedData.attempts >= 5) {
            store.careerOtp.delete(cleanEmail);
            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP."
            });
        }

        if (String(storedData.otp).trim() !== String(otp).trim()) {
            storedData.attempts += 1;
            return res.status(401).json({
                success: false,
                message: "Invalid OTP. Please check the 6-digit code and try again."
            });
        }

        // Valid OTP -> remove from pending OTP store so it cannot be reused
        store.careerOtp.delete(cleanEmail);

        // Issue single-use signed verification token
        const verificationToken = jwt.sign(
            {
                email: cleanEmail,
                purpose: "career_verification",
                verifiedAt: Date.now()
            },
            process.env.JWT_SECRET,
            { expiresIn: "20m" }
        );

        // Track in server memory store to enforce single-use
        store.verifiedCareerTokens.set(verificationToken, {
            email: cleanEmail,
            used: false,
            expiresAt: Date.now() + 20 * 60 * 1000
        });

        logger.info(`[Career OTP] Email ${cleanEmail} verified successfully`);

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            verificationToken
        });

    } catch (error) {
        logger.error("[Career OTP] Error in verifyCareerOtp:", error);
        const err = new errorClass(false, 500, "Unable to verify OTP", "Career OTP verify failed", error);
        next(err);
    }
};

/**
 * Handle resume upload to Cloudinary (folder: 'resume')
 */
export const uploadResume = (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No resume file provided or invalid file format. PDF required."
            });
        }

        const publicId = req.file.filename;
        const cleanId = publicId.replace(/\.pdf$/i, "");
        let viewUrl = req.file.path;
        try {
            viewUrl = cloudinary.utils.private_download_url(cleanId, "pdf", {
                resource_type: "image",
                type: "upload",
                attachment: false
            });
        } catch (e) {
            viewUrl = req.file.path;
        }

        return res.status(200).json({
            success: true,
            message: "Resume uploaded successfully",
            url: req.file.path,
            publicId: req.file.filename,
            viewUrl: viewUrl
        });
    } catch (error) {
        logger.error("[Career Resume] Upload error:", error);
        const err = new errorClass(false, 500, "Unable to upload resume", "Resume upload failed", error);
        next(err);
    }
};

/**
 * Submit career application after verifying OTP token
 */
export const submitCareerApplication = async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            college,
            branch,
            year,
            skills,
            github,
            linkedin,
            domain,
            motivation,
            resume,
            resumePublicId,
            verificationToken
        } = req.body;

        // Verify registration status
        const setting = await Setting.findOne({ key: "registrationOpen" });
        if (setting && setting.value === false) {
            return res.status(403).json({
                success: false,
                message: "Career registrations are currently closed"
            });
        }

        // Enforce OTP verification token - DO NOT trust isVerified boolean
        if (!verificationToken) {
            return res.status(401).json({
                success: false,
                message: "OTP verification required before submitting application"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
        } catch (tokenErr) {
            return res.status(401).json({
                success: false,
                message: "Verification token is invalid or expired. Please verify your email again."
            });
        }

        if (decoded.purpose !== "career_verification") {
            return res.status(401).json({
                success: false,
                message: "Invalid verification purpose"
            });
        }

        const cleanEmail = email?.toLowerCase().trim();
        if (!cleanEmail || !cleanEmail.endsWith("@medicaps.ac.in")) {
            return res.status(400).json({
                success: false,
                message: "Only @medicaps.ac.in college email addresses are eligible to apply"
            });
        }
        if (decoded.email !== cleanEmail) {
            return res.status(401).json({
                success: false,
                message: "Verification token does not match applicant email"
            });
        }

        // Verify that the token hasn't already been used (single-use enforcement)
        const tokenEntry = store.verifiedCareerTokens.get(verificationToken);
        if (!tokenEntry || tokenEntry.used || tokenEntry.expiresAt < Date.now()) {
            return res.status(401).json({
                success: false,
                message: "Verification token has already been used or has expired. Please verify again."
            });
        }

        // Mark token as consumed and evict
        tokenEntry.used = true;
        store.verifiedCareerTokens.delete(verificationToken);

        const finalCollege = (college && college.trim()) ? college.trim() : "Medicaps University";

        // Validate required fields
        if (!name || !email || !phone || !branch || !year || !skills || !domain || !motivation || !resume) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be completed"
            });
        }

        // Duplicate check
        const existing = await Application.findOne({ email: cleanEmail });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Application with this email already exists"
            });
        }

        const formattedSkills = Array.isArray(skills)
            ? skills
            : skills.split(",").map((s) => s.trim()).filter(Boolean);

        const application = new Application({
            name: name.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            college: finalCollege,
            branch: branch.trim(),
            year: String(year),
            skills: formattedSkills,
            github: github ? github.trim() : "",
            linkedin: linkedin ? linkedin.trim() : "",
            domain: domain.trim(),
            position: domain.trim(),
            motivation: motivation.trim(),
            resume: resume.trim(),
            resumePublicId: resumePublicId ? resumePublicId.trim() : "",
            isEmailVerified: true,
            verifiedAt: new Date(),
            status: "ON_HOLD"
        });

        await application.save();

        logger.info(`[ADDITION] New Career Application submitted | Applicant: ${application.name} | Email: ${cleanEmail} | Phone: ${application.phone} | Domain: ${application.domain} | College: ${application.college} | App ID: ${application._id}`);

        return res.status(201).json({
            success: true,
            message: "Application Submitted Successfully",
            data: application
        });

    } catch (error) {
        logger.error("[Career Application] Submission failed:", error);
        const err = new errorClass(false, 500, "Unable To Submit Application", "Career application submit failed", error);
        next(err);
    }
};
