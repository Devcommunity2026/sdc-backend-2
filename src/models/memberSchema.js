// This is to make the collection to store the data of  Core Team member , mentors 
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,
        required: true
    },
    linkedIn: {
        type: String,
        required: true
    },
    Position: {
        type: String,
        required: true
    },
    roleDescription: {
        type: String,
        required: true
    },
    cardPosition: {
        type: Number,
        default:1,
        required: true
    } 
})

const member = mongoose.model('Member', memberSchema);

export default member