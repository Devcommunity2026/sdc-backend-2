import Blog from '../models/blogSchema.js'
import logger from '../config/logger.js'
import errorClass from '../utils/errorClass.js'

export const addBlogData = async (data, req, res, next) => {
    try {
        const blog = new Blog({ ...data })
        await blog.save()
        res.status(200).json({
            success: true,
            message: 'Blog Added Successfully'
        })
        logger.info(`userId:${req.details.userId} | added the ${data.title} blog`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Add Blog', `userId:${req.details.userId} add Blog data to db failed`, error)
        next(err)
    }
}

export const deleteBlogData = async (id, req, res, next) => {
    try {
        await Blog.findOneAndDelete({ _id: id });
        res.status(200).json({
            success: true,
            message: 'Blog deleted Successfully'
        })
        logger.info(`userId:${req.details.userId} | removed the blog of id ${id} `)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Delete Blog', `userId:${req.details.userId} Delete Blog data From db failed`, error)
        next(err)
    }
}

export const editBlogData = async (id, data, req, res, next) => {
    try {
        const blog = await Blog.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Blog Updated Successfully',
            data: blog
        })
        logger.info(`userId:${req.details.userId} | updated the blog of id ${id}`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Edit Blog', `userId:${req.details.userId} Edit Blog data in db failed`, error)
        next(err)
    }
}

export const getPaginatedBlogs = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        const blogs = await Blog.aggregate([
            {
                $sort: { date: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        const totalBlogs = await Blog.countDocuments();

        return {
            success: true,
            data: blogs,
            pagination: {
                total: totalBlogs,
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                limit
            }
        };

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Something went wrong",
            "Failed to fetch paginated Blogs",
            error
        );
        return {
            success: false,
            data: null,
            error: err
        };
    }
};
