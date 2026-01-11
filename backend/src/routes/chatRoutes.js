//Cargar mensajes de la base de datos 50 mensajes

import { Router } from "express";
import { Message } from "../models/Message.js";
import { authenticateJWT } from "../middleware/authenticateJWT.js";

const router = Router();


router.get("/", authenticateJWT, async (req, res) => {
  try {
    const last = await Message.find().sort({ createdAt: -1 }).limit(50);
    res.json(last.reverse());
  } catch (error) {
    res.status(500).json({ error: "Error al cargar historial de chat" });
  }
});

export default router;
