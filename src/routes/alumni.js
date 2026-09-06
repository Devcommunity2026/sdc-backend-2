import express from "express";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import {
    getAllAlumni,
    getSingleAlumni,
    createAlumni,
    updateAlumni,
    deleteAlumni
} from "../controllers/alumniController.js";

const router = express.Router();

// Public routes
router.get('/', getAllAlumni);
router.get('/:id', getSingleAlumni);

// Protected Admin/Moderator routes
router.post('/', roleMiddleware(['admin', 'moderator']), createAlumni);
router.put('/:id', roleMiddleware(['admin', 'moderator']), updateAlumni);
router.patch('/:id', roleMiddleware(['admin', 'moderator']), updateAlumni);
router.delete('/:id', roleMiddleware(['admin', 'moderator']), deleteAlumni);

export default router;
