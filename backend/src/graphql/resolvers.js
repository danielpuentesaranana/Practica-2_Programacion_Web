// Resolvers de GraphQL - Lógica de negocio

import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";
import { GraphQLError } from "graphql";

// ============ HELPERS ============

// Verificar que el usuario está autenticado
const requireAuth = (context) => {
  if (!context.user) {
    throw new GraphQLError("Debes iniciar sesión", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }
  return context.user;
};

// Verificar que el usuario es admin
const requireAdmin = (context) => {
  const user = requireAuth(context);
  if (user.role !== "admin") {
    throw new GraphQLError("Requiere rol de administrador", {
      extensions: { code: "FORBIDDEN" }
    });
  }
  return user;
};

// ============ RESOLVERS ============

export const resolvers = {
  // ============ QUERIES ============
  Query: {
    // --- Productos (público) ---
    products: async () => {
      return await Product.find().sort({ createdAt: -1 });
    },

    product: async (_, { id }) => {
      return await Product.findById(id);
    },

    // --- Carrito (requiere auth) ---
    myCart: async (_, __, context) => {
      const user = requireAuth(context);
      let cart = await Cart.findOne({ userId: user.id });
      
      if (!cart) {
        cart = await Cart.create({ userId: user.id, items: [] });
      }
      
      return {
        id: cart._id,
        userId: cart.userId,
        items: cart.items,
        total: cart.getTotal()
      };
    },

    // --- Pedidos del usuario ---
    myOrders: async (_, __, context) => {
      const user = requireAuth(context);
      return await Order.find({ userId: user.id }).sort({ createdAt: -1 });
    },

    // --- Admin: todos los pedidos ---
    orders: async (_, { filter }, context) => {
      requireAdmin(context);
      
      const query = {};
      if (filter?.status) {
        query.status = filter.status;
      }
      if (filter?.userId) {
        query.userId = filter.userId;
      }
      
      return await Order.find(query).sort({ createdAt: -1 });
    },

    order: async (_, { id }, context) => {
      const user = requireAuth(context);
      const order = await Order.findById(id);
      
      if (!order) {
        throw new GraphQLError("Pedido no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      // Solo admin o el propietario pueden ver el pedido
      if (user.role !== "admin" && order.userId.toString() !== user.id) {
        throw new GraphQLError("No tienes permiso para ver este pedido", {
          extensions: { code: "FORBIDDEN" }
        });
      }
      
      return order;
    },

    // --- Admin: usuarios ---
    users: async (_, __, context) => {
      requireAdmin(context);
      return await User.find().select("-password").sort({ createdAt: -1 });
    },

    user: async (_, { id }, context) => {
      requireAdmin(context);
      return await User.findById(id).select("-password");
    }
  },

  // ============ MUTATIONS ============
  Mutation: {
    // --- Carrito ---
    addToCart: async (_, { productId, quantity = 1 }, context) => {
      const user = requireAuth(context);
      
      // Verificar que el producto existe
      const product = await Product.findById(productId);
      if (!product) {
        throw new GraphQLError("Producto no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      let cart = await Cart.findOne({ userId: user.id });
      
      if (!cart) {
        cart = new Cart({ userId: user.id, items: [] });
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
      
      return {
        id: cart._id,
        userId: cart.userId,
        items: cart.items,
        total: cart.getTotal()
      };
    },

    updateCartItem: async (_, { productId, quantity }, context) => {
      const user = requireAuth(context);
      
      const cart = await Cart.findOne({ userId: user.id });
      if (!cart) {
        throw new GraphQLError("Carrito no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      const item = cart.items.find(
        item => item.productId.toString() === productId
      );
      
      if (!item) {
        throw new GraphQLError("Producto no está en el carrito", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      if (quantity <= 0) {
        cart.items = cart.items.filter(
          item => item.productId.toString() !== productId
        );
      } else {
        item.quantity = quantity;
      }
      
      await cart.save();
      
      return {
        id: cart._id,
        userId: cart.userId,
        items: cart.items,
        total: cart.getTotal()
      };
    },

    removeFromCart: async (_, { productId }, context) => {
      const user = requireAuth(context);
      
      const cart = await Cart.findOne({ userId: user.id });
      if (!cart) {
        throw new GraphQLError("Carrito no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
      );
      
      await cart.save();
      
      return {
        id: cart._id,
        userId: cart.userId,
        items: cart.items,
        total: cart.getTotal()
      };
    },

    clearCart: async (_, __, context) => {
      const user = requireAuth(context);
      
      let cart = await Cart.findOne({ userId: user.id });
      if (!cart) {
        cart = new Cart({ userId: user.id, items: [] });
      } else {
        cart.items = [];
      }
      
      await cart.save();
      
      return {
        id: cart._id,
        userId: cart.userId,
        items: cart.items,
        total: 0
      };
    },

    // --- Pedidos ---
    createOrder: async (_, __, context) => {
      const user = requireAuth(context);
      
      const cart = await Cart.findOne({ userId: user.id });
      
      if (!cart || cart.items.length === 0) {
        throw new GraphQLError("El carrito está vacío", {
          extensions: { code: "BAD_REQUEST" }
        });
      }
      
      // Crear el pedido
      const order = await Order.create({
        userId: user.id,
        username: user.username,
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
      
      // Vaciar el carrito
      cart.items = [];
      await cart.save();
      
      return order;
    },

    updateOrderStatus: async (_, { id, status }, context) => {
      requireAdmin(context);
      
      if (!["pending", "completed"].includes(status)) {
        throw new GraphQLError("Estado no válido. Usa 'pending' o 'completed'", {
          extensions: { code: "BAD_REQUEST" }
        });
      }
      
      const order = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!order) {
        throw new GraphQLError("Pedido no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      return order;
    },

    // --- Admin: usuarios ---
    updateUserRole: async (_, { id, role }, context) => {
      requireAdmin(context);
      
      if (!["usuario", "admin"].includes(role)) {
        throw new GraphQLError("Rol no válido. Usa 'usuario' o 'admin'", {
          extensions: { code: "BAD_REQUEST" }
        });
      }
      
      const userToUpdate = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true }
      ).select("-password");
      
      if (!userToUpdate) {
        throw new GraphQLError("Usuario no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      return userToUpdate;
    },

    deleteUser: async (_, { id }, context) => {
      const currentUser = requireAdmin(context);
      
      // No permitir que el admin se elimine a sí mismo
      if (currentUser.id === id) {
        throw new GraphQLError("No puedes eliminarte a ti mismo", {
          extensions: { code: "BAD_REQUEST" }
        });
      }
      
      const userToDelete = await User.findByIdAndDelete(id);
      
      if (!userToDelete) {
        throw new GraphQLError("Usuario no encontrado", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      
      // Limpiar carrito del usuario eliminado
      await Cart.deleteOne({ userId: id });
      
      return true;
    }
  },

  // ============ RESOLVERS DE CAMPO ============
  // Convertir _id de MongoDB a id
  Product: {
    id: (parent) => parent._id || parent.id,
    createdAt: (parent) => parent.createdAt ? parent.createdAt.toISOString() : null
  },
  
  User: {
    id: (parent) => parent._id || parent.id,
    createdAt: (parent) => parent.createdAt ? parent.createdAt.toISOString() : null
  },
  
  Order: {
    id: (parent) => parent._id || parent.id,
    createdAt: (parent) => parent.createdAt ? parent.createdAt.toISOString() : null,
    updatedAt: (parent) => parent.updatedAt ? parent.updatedAt.toISOString() : null
  },
  
  Cart: {
    id: (parent) => parent._id || parent.id
  }
};