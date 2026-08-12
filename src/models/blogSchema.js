import mongoose from "mongoose";

const blogSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    subHeading: {
        type: String,
        required: true
    },
    subtitle: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    author: {
        type: String,
        required: true
    },
    readTime: {
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
    },
    formattedContent: {
        type: String
    },
    tags: {
        type: [String],
        default: []
    }
})

const Blog = mongoose.model("Blog", blogSchema)
export default Blog