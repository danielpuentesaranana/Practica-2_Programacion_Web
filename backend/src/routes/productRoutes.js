//CRUD de productos

import { Router } from "express";
import { Product } from "../models/Product.js";
import { authenticateJWT, requireAdmin } from "../middleware/authenticateJWT.js";

const router = Router();


router.get("/", async (req, res) => {
  try {
    const items = await Product.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar productos" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar producto" });
  }
});


router.post("/", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imagen } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    if (price == null || isNaN(price) || price < 0) {
      return res.status(400).json({ error: "El precio debe ser un número mayor o igual a 0" });
    }
    const created = await Product.create({ 
      name: name.trim(), 
      description: description?.trim() || "", 
      price,
      imagen: imagen?.trim() || undefined
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});


router.put("/:id", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imagen } = req.body;
    const updateData = {};
    
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ error: "El nombre no puede estar vacío" });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "El precio debe ser un número mayor o igual a 0" });
      }
      updateData.price = price;
    }
    if (imagen !== undefined) {
      updateData.imagen = imagen.trim() || undefined;
    }
    
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});


router.delete("/:id", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ ok: true, message: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default router;

