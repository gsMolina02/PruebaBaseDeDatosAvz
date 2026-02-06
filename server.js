const express = require('express');
const responseTime = require('response-time');
const { connectRedis } = require('./config/redis');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARES ====================

// Middleware para parsear JSON
app.use(express.json());

// Middleware para medir tiempo de respuesta
app.use(responseTime((req, res, time) => {
  console.log(`${req.method} ${req.url} - ${time.toFixed(2)}ms`);
}));

// Middleware para logs básicos
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ==================== RUTAS ====================
app.use('/api', routes);

// Ruta de inicio
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API TecnoMega - Redis + Express',
    version: '1.0.0',
    endpoints: {
      seed: 'POST /api/seed - Carga masiva desde JSON',
      saveCliente: 'POST /api/clientes - Guardar un cliente',
      saveProducto: 'POST /api/productos - Guardar un producto',
      savePedido: 'POST /api/pedidos - Guardar un pedido',
      saveDetalle: 'POST /api/detalle_pedido - Guardar detalle de pedido',
      getCliente: 'GET /api/clientes/:id - Obtener un cliente',
      getProducto: 'GET /api/productos/:id - Obtener un producto',
      getPedido: 'GET /api/pedidos/:id - Obtener un pedido',
      getDetalle: 'GET /api/detalle_pedido/:id - Obtener detalle de pedido',
      listClientes: 'GET /api/clientes - Listar todos los clientes',
      listProductos: 'GET /api/productos - Listar todos los productos',
      listPedidos: 'GET /api/pedidos - Listar todos los pedidos',
      listDetalles: 'GET /api/detalle_pedido - Listar todos los detalles'
    }
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ==================== INICIAR SERVIDOR ====================
async function startServer() {
  try {
    // Conectar a Redis primero
    await connectRedis();
    
    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📡 API disponible en http://localhost:${PORT}/api`);
      console.log(`\n⏱️  Response-time middleware activo`);
      console.log(`📦 Redis conectado y listo\n`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;