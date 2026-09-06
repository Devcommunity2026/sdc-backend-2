import mongoose from "mongoose";

const alumniSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    passingYear: {
        type: Number,
        required: true
    }
});

const alumni = mongoose.model("Alumni", alumniSchema);

export default alumni;
