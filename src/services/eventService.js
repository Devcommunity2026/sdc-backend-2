import event from '../models/eventSchema.js'
import logger from '../config/logger.js'
import errorClass from '../utils/errorClass.js'

export const addEventData = async (data, req, res, next) => {
    try {
        const Event = new event({ ...data })
        await Event.save()
        res.status(200).json({
            success: true,
            message: 'Event Added Successfully'
        })
        logger.info(`userId:${req.details.userId} | added the ${data.name} event`)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Add Event', `userId:${req.details.userId} add Event data to db failed`, error)
        next(err)
    }
}
export const deleteEventData = async (id, req, res, next) => {
    try {
        await event.findOneAndDelete({ _id: id });
        res.status(200).json({
            success: true,
            message: 'Event deleted Successfully'
        })
        logger.info(`userId:${req.details.userId} | removed the event of id ${id} `)
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Delete Event', `userId:${req.details.userId} Delete Event data From db failed`, error)
        next(err)
    }
}

export const getPaginatedEvents = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        const events = await event.aggregate([
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

        const totalEvent = await event.countDocuments();

        return {
            success: true,
            data: events,
            pagination: {
                total: totalEvent,
                currentPage: page,
                totalPages: Math.ceil(totalEvent / limit),
                limit
            }
        };

    } catch (error) {
        const err = new errorClass(
            false,
            500,
            "Something went wrong",
            "Failed to fetch paginated Event",
            error
        );
        return {
            success: false,
            data: null,
            error: err
        };
    }
};

export const editEventData = async (id, data, req, res, next) => {
    try {
        await event.findByIdAndUpdate(id, data, { new: true });
        res.status(200).json({
            success: true,
            message: 'Event Updated Successfully'
        });
        logger.info(`userId:${req.details.userId} | updated the event of id ${id}`);
    } catch (error) {
        const err = new errorClass(false, 500, 'Unable To Edit Event', `userId:${req.details.userId} edit Event data in db failed`, error);
        next(err);
    }
};
