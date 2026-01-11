import mongoose from "mongoose";

const msgSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", msgSchema);
