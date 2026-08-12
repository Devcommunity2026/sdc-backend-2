import mongoose from "mongoose";

const mentorSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    linkedin: {
        type: String,
        required: true
    },

    image: {
        type: String,
        required: true
    }
});

const mentor = mongoose.model("Mentor", mentorSchema);

export default mentor;