import mongoose from "mongoose";
import errorClass from "../utils/errorClass.js";
import {
    getSortedAlumni,
    getAlumniById,
    addAlumniData,
    updateAlumniData,
    removeAlumniData
} from "../services/alumniService.js";

// GET /alumni (with optional ?page=1&limit=10)
export const getAllAlumni = async (req, res, next) => {
    try {
        const page = req.query.page ? Number(req.query.page) : null;
        const limit = req.query.limit ? Number(req.query.limit) : null;

        const result = await getSortedAlumni(page, limit);

        if (!result.success) {
            return next(result.error);
        }

        res.status(200).json(result);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Fetch Alumni",
            "fetch alumni failed",
            error
        );
        next(err);
    }
};

// GET /alumni/:id
export const getSingleAlumni = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid alumni ID is required"
            });
        }

        const result = await getAlumniById(id);

        if (!result.success) {
            if (result.notFound) {
                return res.status(404).json({
                    success: false,
                    message: "Alumni not found"
                });
            }
            return next(result.error);
        }

        res.status(200).json(result);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Fetch Alumni",
            `fetch single alumni ${req.params?.id} failed`,
            error
        );
        next(err);
    }
};

// POST /alumni
export const createAlumni = async (req, res, next) => {
    try {
        const { name, company, passingYear } = req.body;

        const trimmedName = name?.trim();
        const trimmedCompany = company?.trim();
        const parsedYear = Number(passingYear);

        if (!trimmedName || !trimmedCompany || !passingYear || isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
            return res.status(400).json({
                success: false,
                message: "Valid name, company, and passing year (between 1900 and 2100) are required"
            });
        }

        const data = {
            name: trimmedName,
            company: trimmedCompany,
            passingYear: parsedYear
        };

        return await addAlumniData(data, req, res, next);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Add Alumni",
            `userId:${req.details?.userId || 'unknown'} add alumni failed`,
            error
        );
        next(err);
    }
};

// PUT /alumni/:id & PATCH /alumni/:id
export const updateAlumni = async (req, res, next) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid alumni ID is required"
            });
        }

        const { name, company, passingYear } = req.body;

        const trimmedName = name?.trim();
        const trimmedCompany = company?.trim();
        const parsedYear = Number(passingYear);

        if (!trimmedName || !trimmedCompany || !passingYear || isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
            return res.status(400).json({
                success: false,
                message: "Valid name, company, and passing year (between 1900 and 2100) are required"
            });
        }

        const data = {
            name: trimmedName,
            company: trimmedCompany,
            passingYear: parsedYear
        };

        return await updateAlumniData(id, data, req, res, next);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Edit Alumni",
            `userId:${req.details?.userId || 'unknown'} edit alumni failed`,
            error
        );
        next(err);
    }
};

// DELETE /alumni/:id
export const deleteAlumni = async (req, res, next) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid alumni ID is required"
            });
        }

        return await removeAlumniData(id, req, res, next);
    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Unable To Remove Alumni",
            `userId:${req.details?.userId || 'unknown'} remove alumni failed`,
            error
        );
        next(err);
    }
};
