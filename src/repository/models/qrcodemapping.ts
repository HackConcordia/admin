import mongoose from "mongoose";

const qrCodeMappingSchema = new mongoose.Schema(
  {
    qrCodeNumber: { type: Number, required: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applications",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    checkedInAt: { type: Date, default: Date.now },
    checkedInBy: { type: String, default: "system" },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

const QrCodeMapping =
  mongoose.models.QrCodeMapping ||
  mongoose.model("QrCodeMapping", qrCodeMappingSchema);

export default QrCodeMapping;
