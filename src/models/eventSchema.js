import mongoose from "mongoose";

const eventSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    subHeading: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    form: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
})

const event = mongoose.model("Event", eventSchema)
export default event