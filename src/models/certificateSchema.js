import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, "Certificate ID is required"],
      unique: true,
      index: true,
      trim: true,
    },
    holderName: {
      type: String,
      required: [true, "Holder name is required"],
      trim: true,
    },
    courseOrTitle: {
      type: String,
      required: [true, "Course or event title is required"],
      trim: true,
    },
    certificateType: {
      type: String,
      enum: {
        values: ["internship", "participation", "merit", "appreciation", "custom"],
        message: "{VALUE} is not a valid certificate type",
      },
      default: "internship",
      trim: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    issueDate: {
      type: Date,
      required: [true, "Issue date is required"],
      default: Date.now,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["valid", "revoked"],
        message: "{VALUE} is not a valid certificate status",
      },
      default: "valid",
    },
  },
  {
    timestamps: true,
  }
);

const Certificate = mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);

export default Certificate;
