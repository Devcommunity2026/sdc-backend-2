import mongoose from "mongoose";
import counter from "./counterSchema.js";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "moderator", "mentor", "team", "user"],
        default: "user"
    },
    profileImage: {
        type: String,
        default: null
    },
    linkedIn: {
        type: String,
        default: null
    },
    Position: {
        type: String,
        default: null
    },
    roleDescription: {
        type: String,
        default: null
    },
    isBanned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

userSchema.pre('validate', async function () {
    console.log(this)
    if (this.isNew) {
        try {
            const count = await counter.findOneAndUpdate(
                { id: 'userCounter' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            )
            this.userId = count.seq
        }
        catch (error) {
            console.log(error)
        }
    }
})

const User = mongoose.model("User", userSchema);
export default User