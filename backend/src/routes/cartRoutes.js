// Gestión del carrito de compra

import { Router } from "express";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();

// GET /api/cart - Obtener carrito del usuario
router.get("/", authenticateJWT, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }
    
    res.json({
      id: cart._id,
      items: cart.items,
      total: cart.getTotal()
    });
  } catch (error) {
    res.status(500).json({ error: "Error al cargar carrito" });
  }
});

// POST /api/cart/add - Añadir producto al carrito
router.post("/add", authenticateJWT, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: "productId es obligatorio" });
    }
    
    // Verificar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    }
    
    // Buscar si el producto ya está en el carrito
    const existingItem = cart.items.find(
      item => item.productId.toString() === productId
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        imagen: product.imagen
      });
    }
    
    await cart.save();
    
    res.json({
      id: cart._id,
      items: cart.items,
      total: cart.getTotal()
    });
  } catch (error) {
    console.error("Error al añadir al carrito:", error);
    res.status(500).json({ error: "Error al añadir al carrito" });
  }
});

// PUT /api/cart/update - Actualizar cantidad de un producto
router.put("/update", authenticateJWT, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: "productId y quantity son obligatorios" });
    }
    
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ error: "Carrito no encontrado" });
    }
    
    const item = cart.items.find(
      item => item.productId.toString() === productId
    );
    
    if (!item) {
      return res.status(404).json({ error: "Producto no está en el carrito" });
    }
    
    if (quantity <= 0) {
      // Eliminar el producto si la cantidad es 0 o menor
      cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }
    
    await cart.save();
    
    res.json({
      id: cart._id,
      items: cart.items,
      total: cart.getTotal()
    });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar carrito" });
  }
});

// DELETE /api/cart/remove/:productId - Eliminar producto del carrito
router.delete("/remove/:productId", authenticateJWT, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ error: "Carrito no encontrado" });
    }
    
    cart.items = cart.items.filter(
      item => item.productId.toString() !== req.params.productId
    );
    
    await cart.save();
    
    res.json({
      id: cart._id,
      items: cart.items,
      total: cart.getTotal()
    });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar del carrito" });
  }
});

// DELETE /api/cart/clear - Vaciar carrito
router.delete("/clear", authenticateJWT, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    } else {
      cart.items = [];
    }
    
    await cart.save();
    
    res.json({
      id: cart._id,
      items: [],
      total: 0
    });
  } catch (error) {
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
});

export default router;