// Definición de tipos GraphQL (TypeDefs)

export const typeDefs = `#graphql
  # ============ TIPOS BASE ============
  
  type User {
    id: ID!
    username: String!
    role: String!
    createdAt: String
  }

  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    imagen: String
    createdAt: String
  }

  type CartItem {
    productId: ID!
    name: String!
    price: Float!
    quantity: Int!
    imagen: String
  }

  type Cart {
    id: ID!
    userId: ID!
    items: [CartItem!]!
    total: Float!
  }

  type OrderItem {
    productId: ID!
    name: String!
    price: Float!
    quantity: Int!
    imagen: String
  }

  type Order {
    id: ID!
    userId: ID!
    username: String!
    items: [OrderItem!]!
    total: Float!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  # ============ INPUTS ============

  input OrderFilterInput {
    status: String
    userId: ID
  }

  # ============ QUERIES ============

  type Query {
    # Productos (público)
    products: [Product!]!
    product(id: ID!): Product

    # Carrito (requiere auth)
    myCart: Cart

    # Pedidos del usuario (requiere auth)
    myOrders: [Order!]!

    # Admin: todos los pedidos
    orders(filter: OrderFilterInput): [Order!]!
    order(id: ID!): Order

    # Admin: todos los usuarios
    users: [User!]!
    user(id: ID!): User
  }

  # ============ MUTATIONS ============

  type Mutation {
    # Carrito
    addToCart(productId: ID!, quantity: Int): Cart!
    updateCartItem(productId: ID!, quantity: Int!): Cart!
    removeFromCart(productId: ID!): Cart!
    clearCart: Cart!

    # Pedidos
    createOrder: Order!
    
    # Admin: gestión de pedidos
    updateOrderStatus(id: ID!, status: String!): Order!

    # Admin: gestión de usuarios
    updateUserRole(id: ID!, role: String!): User!
    deleteUser(id: ID!): Boolean!
  }
`;