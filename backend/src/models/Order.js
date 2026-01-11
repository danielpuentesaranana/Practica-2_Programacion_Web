import mongoose from "mongoose";

// Schema para cada producto dentro del pedido
const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  imagen: { type: String }
});

// Schema principal del pedido
const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    items: [orderItemSchema],
    total: { type: Number, required: true, min: 0 },
    status: { 
      type: String, 
      enum: ["pending", "completed"], 
      default: "pending" 
    }
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);