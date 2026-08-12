import project from '../models/projectSchema.js';
import logger from '../config/logger.js';
import errorClass from '../utils/errorClass.js';

export const addProjectData = async (data, req, res, next) => {
    try {

        const Project = new project({ ...data });

        await Project.save();

        res.status(200).json({
            success: true,
            message: 'Project Added Successfully'
        });

        logger.info(`userId:${req.details.userId} | added project ${data.name}`);

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

export const deleteProjectData = async (id, req, res, next) => {
    try {

        await project.findOneAndDelete({ _id: id });

        res.status(200).json({
            success: true,
            message: 'Project Deleted Successfully'
        });

        logger.info(`userId:${req.details.userId} | removed project ${id}`);

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

export const getPaginatedProjects = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        const projects = await project.aggregate([
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        const totalProject = await project.countDocuments();

        return {
            success: true,
            data: projects,
            pagination: {
                total: totalProject,
                currentPage: page,
                totalPages: Math.ceil(totalProject / limit),
                limit
            }
        };

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Something went wrong",
            "Failed to fetch paginated Project",
            error
        );
        return {
            success: false,
            data: null,
            error: err
        };
    }
};

export const editProjectData = async (id, data, req, res, next) => {
    try {
        await project.findByIdAndUpdate(id, data, { new: true });
        res.status(200).json({
            success: true,
            message: 'Project Updated Successfully'
        });
        logger.info(`userId:${req.details.userId} | updated project ${id}`);
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