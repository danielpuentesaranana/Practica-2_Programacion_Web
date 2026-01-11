//Login

import { Router } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }
    if (role === "admin") {
      return res.status(403).json({ error: "No se puede crear un usuario administrador desde el registro" });
    }

    const exists = await User.findOne({ username: username.trim() });
    if (exists) return res.status(409).json({ error: "Usuario ya existe" });

    const user = new User({ username: username.trim(), password, role: "usuario" });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: "3h" }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: "Error en registro" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }
    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Credenciales no válidas" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: "3h" }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: "Error en login" });
  }
});

export default router;
