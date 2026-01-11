export const config = {
  port: process.env.PORT || 3000,
  mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017/valles",
  jwtSecret: process.env.JWT_SECRET || "vallespasiegos"
};
