import mongoose from "mongoose";

const projectSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    subHeading: {
        type: String,
        required: true
    },


    live: {
        type: String,
        required: true
    },

    techStack: {
        type: [String],
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
});

const project = mongoose.model("Project", projectSchema);

export default project;