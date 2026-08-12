import mongoose, { model } from "mongoose";

const counterSchema = mongoose.Schema({
    id: String,
    seq: {
        type: Number,
        default: 0,
    }
})

const counter = mongoose.model("Counter", counterSchema)
export default counter