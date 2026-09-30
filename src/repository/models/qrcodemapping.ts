import mongoose from "mongoose";

/**
 * event-checkin owns the `qrcodemappings` collection and its indexes (qrCodeNumber is unique
 * there). `unique: true` is declared for parity only: with autoIndex/autoCreate off this app never
 * builds it, but the organizer check-in relies on the index to turn a concurrent claim into E11000.
 */
const qrCodeMappingSchema = new mongoose.Schema(
  {
    qrCodeNumber: { type: Number, required: true, unique: true },
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
    autoIndex: false,
    autoCreate: false,
  }
);

const QrCodeMapping =
  mongoose.models.QrCodeMapping ||
  mongoose.model("QrCodeMapping", qrCodeMappingSchema);

export default QrCodeMapping;
