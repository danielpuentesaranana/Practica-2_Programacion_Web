// Gestión de pedidos (Orders)

import { Router } from "express";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { authenticateJWT, requireAdmin } from "../middleware/authenticateJWT.js";

const router = Router();

// GET /api/orders - Listar pedidos
// Admin: ve todos los pedidos, Usuario: solo los suyos
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const query = {};
    
    // Si no es admin, solo ver sus propios pedidos
    if (req.user.role !== "admin") {
      query.userId = req.user.id;
    } else {
      // Admin puede filtrar por estado
      if (req.query.status && ["pending", "completed"].includes(req.query.status)) {
        query.status = req.query.status;
      }
      // Admin puede filtrar por usuario
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
    }
    
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar pedidos" });
  }
});

// GET /api/orders/:id - Obtener detalle de un pedido
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    
    // Solo admin o el propietario pueden ver el pedido
    if (req.user.role !== "admin" && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "No tienes permiso para ver este pedido" });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar pedido" });
  }
});

// POST /api/orders - Crear pedido desde el carrito
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }
    
    // Crear el pedido
    const order = await Order.create({
      userId: req.user.id,
      username: req.user.username,
      items: cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imagen: item.imagen
      })),
      total: cart.getTotal(),
      status: "pending"
    });
    
    // Vaciar el carrito después de crear el pedido
    cart.items = [];
    await cart.save();
    
    res.status(201).json(order);
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

// PUT /api/orders/:id/status - Actualizar estado del pedido (solo admin)
router.put("/:id/status", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({ error: "Estado no válido. Usa 'pending' o 'completed'" });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado del pedido" });
  }
});

export default router;