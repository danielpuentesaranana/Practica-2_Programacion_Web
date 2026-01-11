import mongoose from "mongoose";

// Schema para cada item del carrito
const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  imagen: { type: String }
});

// Schema principal del carrito
const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

// Método para calcular el total del carrito
cartSchema.methods.getTotal = function() {
  return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

export const Cart = mongoose.model("Cart", cartSchema);