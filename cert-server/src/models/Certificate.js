import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    holderName: {
      type: String,
      required: [true, 'Holder name is required'],
      trim: true,
    },
    courseOrTitle: {
      type: String,
      required: [true, 'Course or title is required'],
      trim: true,
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['valid', 'revoked'],
        message: '{VALUE} is not a valid certificate status',
      },
      default: 'valid',
    },
    certificateType: {
      type: String,
      enum: ['participation', 'merit', 'appreciation', 'custom'],
      default: 'participation',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.cloudinaryPublicId;
        return ret;
      },
    },
  }
);

export const Certificate = mongoose.model('Certificate', certificateSchema);
