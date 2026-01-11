// CRUD de usuarios (solo admin)

import { Router } from "express";
import { User } from "../models/User.js";
import { Cart } from "../models/Cart.js";
import { authenticateJWT, requireAdmin } from "../middleware/authenticateJWT.js";

const router = Router();

// GET /api/users - Listar todos los usuarios (admin)
router.get("/", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

// GET /api/users/:id - Obtener un usuario (admin)
router.get("/:id", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar usuario" });
  }
});

// PUT /api/users/:id/role - Cambiar rol de usuario (admin)
router.put("/:id/role", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!["usuario", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rol no válido. Usa 'usuario' o 'admin'" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar rol" });
  }
});

// DELETE /api/users/:id - Eliminar usuario (admin)
router.delete("/:id", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // No permitir que el admin se elimine a sí mismo
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // Limpiar carrito del usuario eliminado
    await Cart.deleteOne({ userId: req.params.id });
    
    res.json({ ok: true, message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;