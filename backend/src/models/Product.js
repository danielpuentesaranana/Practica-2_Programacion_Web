import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    imagen: { type: String, required: false, trim: true }, 
    price: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);