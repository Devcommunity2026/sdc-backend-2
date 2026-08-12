import mongoose from "mongoose";

const coreTeamSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    post: {
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

const coreTeam = mongoose.model("CoreTeam", coreTeamSchema);

export default coreTeam;