// ============ CONFIGURACIÓN ============
const API = location.origin + "/api";
const GRAPHQL = location.origin + "/graphql";

let token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");
let socket = null;

// ============ ELEMENTOS DOM ============
const whoami = document.getElementById("whoami");
const btnLogout = document.getElementById("btn-logout");
const btnCart = document.getElementById("btn-cart");
const adminPanel = document.getElementById("admin-panel");
const adminSection = document.getElementById("admin-section");
const myOrdersSection = document.getElementById("my-orders-section");
const chatSection = document.getElementById("chat");
const cartModal = document.getElementById("cart-modal");

// ============ HELPER GRAPHQL ============
async function graphqlQuery(query, variables = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });
  
  const data = await res.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  return data.data;
}

// ============ HELPER: FORMATEAR FECHAS ============
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short", 
    year: "numeric"
  });
}

function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-ES", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, duration = 2500) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hide");
  setTimeout(() => toast.classList.add("hide"), duration);
}

// ============ AUTENTICACIÓN ============
function renderAuthState() {
  if (user) {
    whoami.innerHTML = `
      <span style="color: var(--success)">●</span> 
      Conectado como <strong>${user.username}</strong> 
      <span class="role-badge role-${user.role}">${user.role}</span>
    `;
    btnLogout.classList.remove("hide");
    btnCart.classList.remove("hide");
    chatSection.classList.remove("hide");
    myOrdersSection.classList.remove("hide");
    
    if (user.role === "admin") {
      adminPanel.classList.remove("hide");
      adminSection.classList.remove("hide");
      loadUsers();
      loadAllOrders();
    } else {
      adminPanel.classList.add("hide");
      adminSection.classList.add("hide");
    }
    
    loadCart();
    loadMyOrders();
  } else {
    whoami.textContent = "Inicia sesión para comenzar a comprar";
    btnLogout.classList.add("hide");
    btnCart.classList.add("hide");
    adminPanel.classList.add("hide");
    adminSection.classList.add("hide");
    chatSection.classList.add("hide");
    myOrdersSection.classList.add("hide");
    document.getElementById("cart-count").textContent = "0";
  }
}

// Registro
document.getElementById("btn-register").addEventListener("click", async () => {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  
  if (!username || !password) return showToast("Completa todos los campos");
  if (username.length < 3) return showToast("Usuario: mínimo 3 caracteres");
  if (password.length < 4) return showToast("Contraseña: mínimo 4 caracteres");
  
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || "Error en registro");
    
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    token = data.token;
    user = data.user;
    
    showToast(`¡Bienvenido, ${user.username}!`);
    renderAuthState();
    loadProducts();
    initChat();
  } catch (e) {
    showToast("Error de conexión");
  }
});

// Login
document.getElementById("btn-login").addEventListener("click", async () => {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  
  if (!username || !password) return showToast("Completa todos los campos");
  
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || "Credenciales incorrectas");
    
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    token = data.token;
    user = data.user;
    
    showToast(`¡Hola de nuevo, ${user.username}!`);
    renderAuthState();
    loadProducts();
    initChat();
  } catch (e) {
    showToast("Error de conexión");
  }
});

// Logout
btnLogout.addEventListener("click", () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  token = null;
  user = null;
  
  showToast("Sesión cerrada");
  renderAuthState();
  loadProducts();
  document.getElementById("messages").innerHTML = "";
});

// ============ PRODUCTOS (GraphQL) ============
async function loadProducts() {
  try {
    const data = await graphqlQuery(`
      query {
        products {
          id
          name
          description
          price
          imagen
        }
      }
    `);
    
    const list = document.getElementById("list");
    
    if (data.products.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
          </svg>
          <p>No hay productos disponibles</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = data.products.map(p => `
      <div class="product-card">
        ${p.imagen 
          ? `<img src="${p.imagen}" alt="${p.name}" class="product-image" onerror="this.outerHTML='<div class=product-image-placeholder>🖼️</div>'"/>` 
          : `<div class="product-image-placeholder">🏔️</div>`
        }
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.description || "Producto artesanal de los Valles Pasiegos"}</p>
          <div class="product-footer">
            <span class="product-price">${p.price.toFixed(2)}€</span>
            <div class="product-actions">
              ${user ? `
                <button class="btn btn-primary btn-sm add-cart" data-id="${p.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </button>
              ` : ""}
              ${user?.role === "admin" ? `
                <button class="btn btn-sm edit-product" data-id="${p.id}">✏️</button>
                <button class="btn btn-danger btn-sm del-product" data-id="${p.id}">🗑️</button>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `).join("");
    
    // Event listeners
    list.querySelectorAll(".add-cart").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.id));
    });
    
    list.querySelectorAll(".edit-product").forEach(btn => {
      btn.addEventListener("click", () => editProduct(btn.dataset.id));
    });
    
    list.querySelectorAll(".del-product").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
    });
  } catch (error) {
    console.error("Error al cargar productos:", error);
  }
}

async function editProduct(id) {
  try {
    const data = await graphqlQuery(`
      query($id: ID!) { 
        product(id: $id) { name description price imagen } 
      }
    `, { id });
    
    const p = data.product;
    if (!p) return showToast("Producto no encontrado");
    
    const name = prompt("Nombre:", p.name);
    if (name === null) return;
    
    const priceInput = prompt("Precio:", p.price);
    if (priceInput === null) return;
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) return showToast("Precio inválido");
    
    const description = prompt("Descripción:", p.description || "");
    if (description === null) return;
    
    const imagen = prompt("URL de imagen:", p.imagen || "");
    if (imagen === null) return;
    
    const res = await fetch(`${API}/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ name, price, description, imagen: imagen || undefined })
    });
    
    if (!res.ok) return showToast("Error al editar");
    
    showToast("Producto actualizado");
    loadProducts();
  } catch (e) {
    showToast("Error: " + e.message);
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  
  try {
    const res = await fetch(`${API}/productos/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) return showToast("Error al eliminar");
    
    showToast("Producto eliminado");
    loadProducts();
  } catch (e) {
    showToast("Error: " + e.message);
  }
}

// Crear producto
document.getElementById("btn-create").addEventListener("click", async () => {
  const name = document.getElementById("p-name").value.trim();
  const priceInput = document.getElementById("p-price").value;
  const price = parseFloat(priceInput);
  const description = document.getElementById("p-desc").value.trim();
  const imagen = document.getElementById("p-imagen").value.trim();
  
  if (!name) return showToast("El nombre es obligatorio");
  if (!priceInput || isNaN(price) || price < 0) return showToast("Precio inválido");
  
  try {
    const res = await fetch(`${API}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ name, price, description, imagen: imagen || undefined })
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showToast(data.error || "Error al crear");
    }
    
    // Limpiar form
    document.getElementById("p-name").value = "";
    document.getElementById("p-price").value = "";
    document.getElementById("p-desc").value = "";
    document.getElementById("p-imagen").value = "";
    
    showToast("Producto creado");
    loadProducts();
  } catch (e) {
    showToast("Error: " + e.message);
  }
});

// ============ CARRITO (GraphQL) ============
async function loadCart() {
  if (!token) return;
  
  try {
    const data = await graphqlQuery(`
      query { 
        myCart { 
          items { productId name price quantity imagen } 
          total 
        } 
      }
    `);
    updateCartUI(data.myCart);
  } catch (e) {
    console.error("Error al cargar carrito:", e);
  }
}

function updateCartUI(cart) {
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").textContent = count;
  
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  
  if (cart.items.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Tu carrito está vacío</p>
      </div>
    `;
    cartTotal.innerHTML = "";
    return;
  }
  
  cartItems.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      ${item.imagen 
        ? `<img src="${item.imagen}" class="cart-item-img" alt="${item.name}"/>` 
        : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;">🏔️</div>`
      }
      <div class="cart-item-info">
        <strong>${item.name}</strong>
        <span>${item.price.toFixed(2)}€ × ${item.quantity}</span>
      </div>
      <div class="cart-item-actions">
        <button class="btn btn-sm" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">−</button>
        <span>${item.quantity}</span>
        <button class="btn btn-sm" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
        <button class="btn btn-sm" onclick="removeFromCart('${item.productId}')">🗑️</button>
      </div>
    </div>
  `).join("");
  
  cartTotal.innerHTML = `Total: <span style="color: var(--success)">${cart.total.toFixed(2)}€</span>`;
}

async function addToCart(productId) {
  try {
    const data = await graphqlQuery(`
      mutation($productId: ID!) {
        addToCart(productId: $productId, quantity: 1) {
          items { productId name price quantity imagen }
          total
        }
      }
    `, { productId });
    
    updateCartUI(data.addToCart);
    showToast("Añadido al carrito");
  } catch (e) {
    showToast("Error: " + e.message);
  }
}

window.updateCartQuantity = async function(productId, quantity) {
  try {
    const data = await graphqlQuery(`
      mutation($productId: ID!, $quantity: Int!) {
        updateCartItem(productId: $productId, quantity: $quantity) {
          items { productId name price quantity imagen }
          total
        }
      }
    `, { productId, quantity });
    
    updateCartUI(data.updateCartItem);
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

window.removeFromCart = async function(productId) {
  try {
    const data = await graphqlQuery(`
      mutation($productId: ID!) {
        removeFromCart(productId: $productId) {
          items { productId name price quantity imagen }
          total
        }
      }
    `, { productId });
    
    updateCartUI(data.removeFromCart);
    showToast("Eliminado del carrito");
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

// Vaciar carrito
document.getElementById("btn-clear-cart").addEventListener("click", async () => {
  if (!confirm("¿Vaciar el carrito?")) return;
  
  try {
    const data = await graphqlQuery(`mutation { clearCart { items { productId } total } }`);
    updateCartUI(data.clearCart);
    showToast("Carrito vaciado");
  } catch (e) {
    showToast("Error: " + e.message);
  }
});

// Finalizar compra
document.getElementById("btn-checkout").addEventListener("click", async () => {
  if (!confirm("¿Confirmar la compra?")) return;
  
  try {
    const data = await graphqlQuery(`
      mutation {
        createOrder {
          id
          total
          status
        }
      }
    `);
    
    showToast(`¡Pedido realizado! Total: ${data.createOrder.total.toFixed(2)}€`);
    loadCart();
    loadMyOrders();
    if (user?.role === "admin") loadAllOrders();
    cartModal.classList.add("hide");
  } catch (e) {
    showToast("Error: " + e.message);
  }
});

// Modal carrito
btnCart.addEventListener("click", () => cartModal.classList.remove("hide"));
document.getElementById("close-cart").addEventListener("click", () => cartModal.classList.add("hide"));

// ============ MIS PEDIDOS (GraphQL) ============
async function loadMyOrders() {
  if (!token) return;
  
  try {
    const data = await graphqlQuery(`
      query {
        myOrders {
          id
          items { name price quantity }
          total
          status
          createdAt
        }
      }
    `);
    
    const list = document.getElementById("my-orders-list");
    
    if (data.myOrders.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <p>Aún no tienes pedidos</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = data.myOrders.map(order => `
      <div class="order-card">
        <div class="order-info">
          <h4>Pedido #${order.id.slice(-6).toUpperCase()}</h4>
          <p class="order-meta">
            ${order.items.map(i => `${i.name} ×${i.quantity}`).join(", ")}
            <br/>
            ${formatDate(order.createdAt)}
          </p>
        </div>
        <div style="text-align: right;">
          <span class="status-badge status-${order.status}">
            ${order.status === "pending" ? "🟡 En curso" : "🟢 Completado"}
          </span>
          <div class="order-total">${order.total.toFixed(2)}€</div>
        </div>
      </div>
    `).join("");
  } catch (e) {
    console.error("Error al cargar mis pedidos:", e);
  }
}

// ============ ADMIN: USUARIOS (GraphQL) ============
async function loadUsers() {
  if (!token || user?.role !== "admin") return;
  
  try {
    const data = await graphqlQuery(`
      query {
        users {
          id
          username
          role
          createdAt
        }
      }
    `);
    
    const list = document.getElementById("users-list");
    
    if (data.users.length === 0) {
      list.innerHTML = '<p class="empty-state">No hay usuarios</p>';
      return;
    }
    
    list.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td><span class="role-badge role-${u.role}">${u.role}</span></td>
              <td>${formatDate(u.createdAt)}</td>
              <td class="table-actions">
                <button class="btn btn-sm" onclick="toggleUserRole('${u.id}', '${u.role}')">
                  ${u.role === "admin" ? "👤 Hacer usuario" : "👑 Hacer admin"}
                </button>
                ${u.id !== user.id ? `
                  <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">🗑️</button>
                ` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error("Error al cargar usuarios:", e);
  }
}

window.toggleUserRole = async function(id, currentRole) {
  const newRole = currentRole === "admin" ? "usuario" : "admin";
  if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
  
  try {
    await graphqlQuery(`
      mutation($id: ID!, $role: String!) {
        updateUserRole(id: $id, role: $role) { id role }
      }
    `, { id, role: newRole });
    
    showToast("Rol actualizado");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

window.deleteUser = async function(id) {
  if (!confirm("¿Eliminar este usuario permanentemente?")) return;
  
  try {
    await graphqlQuery(`mutation($id: ID!) { deleteUser(id: $id) }`, { id });
    showToast("Usuario eliminado");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

// ============ ADMIN: PEDIDOS (GraphQL) ============
async function loadAllOrders() {
  if (!token || user?.role !== "admin") return;
  
  try {
    const filter = document.getElementById("order-filter").value;
    
    const data = await graphqlQuery(`
      query($filter: OrderFilterInput) {
        orders(filter: $filter) {
          id
          username
          items { name price quantity }
          total
          status
          createdAt
        }
      }
    `, { filter: filter ? { status: filter } : null });
    
    const list = document.getElementById("orders-list");
    
    if (data.orders.length === 0) {
      list.innerHTML = '<p class="empty-state">No hay pedidos</p>';
      return;
    }
    
    list.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Productos</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(order => `
            <tr>
              <td><strong>#${order.id.slice(-6).toUpperCase()}</strong></td>
              <td>${order.username}</td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                ${order.items.map(i => `${i.name} ×${i.quantity}`).join(", ")}
              </td>
              <td><strong>${order.total.toFixed(2)}€</strong></td>
              <td>
                <span class="status-badge status-${order.status}">
                  ${order.status === "pending" ? "En curso" : "Completado"}
                </span>
              </td>
              <td>${formatDate(order.createdAt)}</td>
              <td>
                ${order.status === "pending" 
                  ? `<button class="btn btn-success btn-sm" onclick="completeOrder('${order.id}')">✓ Completar</button>`
                  : `<button class="btn btn-sm" onclick="reopenOrder('${order.id}')">↺ Reabrir</button>`
                }
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error("Error al cargar pedidos:", e);
  }
}

window.completeOrder = async function(id) {
  try {
    await graphqlQuery(`
      mutation($id: ID!) {
        updateOrderStatus(id: $id, status: "completed") { id status }
      }
    `, { id });
    
    showToast("Pedido completado");
    loadAllOrders();
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

window.reopenOrder = async function(id) {
  try {
    await graphqlQuery(`
      mutation($id: ID!) {
        updateOrderStatus(id: $id, status: "pending") { id status }
      }
    `, { id });
    
    showToast("Pedido reabierto");
    loadAllOrders();
  } catch (e) {
    showToast("Error: " + e.message);
  }
};

// Filtro de pedidos
document.getElementById("order-filter").addEventListener("change", loadAllOrders);

// ============ CHAT (Socket.IO) ============
async function initChat() {
  if (!token) return;
  
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  try {
    const res = await fetch(`${API}/chat`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) return;
    
    const history = await res.json();
    const messages = document.getElementById("messages");
    messages.innerHTML = "";
    
    history.forEach(m => {
      const div = document.createElement("div");
      div.innerHTML = `<strong>${m.username}</strong>: ${m.text} <small style="opacity:0.5">${formatTime(m.createdAt)}</small>`;
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;
    
    // Conectar Socket.IO
    socket = io({ auth: { token } });
    
    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });
    
    socket.on("chat:message", (m) => {
      const div = document.createElement("div");
      div.innerHTML = `<strong>${m.username}</strong>: ${m.text} <small style="opacity:0.5">${formatTime(m.createdAt)}</small>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    });
    
    // Enviar mensaje
    const sendMessage = () => {
      const input = document.getElementById("msg");
      const text = input.value.trim();
      if (!text) return;
      socket.emit("chat:message", { text });
      input.value = "";
    };
    
    document.getElementById("btn-send").onclick = sendMessage;
    document.getElementById("msg").onkeypress = (e) => {
      if (e.key === "Enter") sendMessage();
    };
  } catch (e) {
    console.error("Error al inicializar chat:", e);
  }
}

// ============ INICIALIZACIÓN ============
renderAuthState();
loadProducts();
if (token && user) initChat();

// Verificar token válido al cargar
if (token) {
  fetch(`${API}/chat`, { headers: { "Authorization": `Bearer ${token}` } })
    .then(res => {
      if (!res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        token = null;
        user = null;
        renderAuthState();
      }
    })
    .catch(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      token = null;
      user = null;
      renderAuthState();
    });
}