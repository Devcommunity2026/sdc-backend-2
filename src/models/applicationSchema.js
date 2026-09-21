import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    college: {
      type: String,
      required: true,
      trim: true,
    },

    branch: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: String,
      required: true,
      enum: ["1", "2", "3", "4"],
    },

    skills: {
      type: [String],
      required: true,
      default: [],
    },

    github: {
      type: String,
      trim: true,
      default: "",
    },

    linkedin: {
      type: String,
      trim: true,
      default: "",
    },

    resume: {
      type: String,
      required: true,
      trim: true,
    },

    resumePublicId: {
      type: String,
      trim: true,
      default: "",
    },

    position: {
      type: String,
      trim: true,
      default: "",
    },

    domain: {
      type: String,
      enum: [
        "Web Development",
        "AI / Machine Learning",
        "Cybersecurity",
        "Mobile App Development",
        "HR",
        "Graphics",
      ],
      required: true,
      trim: true,
    },

    motivation: {
      type: String,
      required: true,
      trim: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "On Hold",
        "Selected",
        "Rejected",
        "ON_HOLD",
        "SELECTED",
        "REJECTED",
      ],
      default: "ON_HOLD",
    },
  },
  {
    timestamps: true,
  }
);

const Application =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);

export default Application;