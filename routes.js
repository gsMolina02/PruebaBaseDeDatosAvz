const express = require('express');
const router = express.Router();
const { client } = require('./config/redis');
const fs = require('fs').promises;
const path = require('path');

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Guarda un registro en Redis y lo añade al Set de índice
 */
async function saveRecord(collection, id, data) {
  const key = `${collection}:${id}`;
  const indexKey = `${collection}:index`;
  
  // Guardar el registro como JSON string
  await client.set(key, JSON.stringify(data));
  
  // Añadir el ID al Set de índice
  await client.sAdd(indexKey, id);
  
  return key;
}

/**
 * Obtiene un registro de Redis
 */
async function getRecord(collection, id) {
  const key = `${collection}:${id}`;
  const data = await client.get(key);
  
  if (!data) {
    return null;
  }
  
  return JSON.parse(data);
}

/**
 * Obtiene todos los registros de una colección
 */
async function getAllRecords(collection) {
  const indexKey = `${collection}:index`;
  
  // Obtener todos los IDs del Set
  const ids = await client.sMembers(indexKey);
  
  if (ids.length === 0) {
    return [];
  }
  
  // Obtener todos los registros
  const records = [];
  for (const id of ids) {
    const record = await getRecord(collection, id);
    if (record) {
      records.push(record);
    }
  }
  
  return records;
}

// ==================== ENDPOINT 1: CARGA MASIVA (SEED) ====================

router.post('/seed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Leer archivo JSON
    const filePath = path.join(__dirname, 'data', 'tecnomega.json');
    console.log('📂 Leyendo archivo:', filePath);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('📄 Tamaño del archivo:', fileContent.length, 'caracteres');
    
    // Eliminar BOM si existe
    const cleanContent = fileContent.replace(/^\uFEFF/, '');
    
    const data = JSON.parse(cleanContent);
    console.log('✅ JSON parseado correctamente');
    
    let totalInserted = 0;
    const summary = {};
    
    // Procesar cada colección
    for (const [collection, records] of Object.entries(data)) {
      let count = 0;
      
      for (const record of records) {
        await saveRecord(collection, record.id, record);
        count++;
        totalInserted++;
      }
      
      summary[collection] = count;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    res.json({
      success: true,
      message: '✅ Datos cargados exitosamente',
      totalRegistros: totalInserted,
      detalle: summary,
      tiempoMs: duration,
      tiempoSegundos: (duration / 1000).toFixed(2)
    });
    
  } catch (error) {
    console.error('Error en seed:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar los datos',
      detalle: error.message
    });
  }
});

// ==================== ENDPOINT 2: GUARDAR 1 REGISTRO (SET) ====================

// Guardar un cliente
router.post('/clientes', async (req, res) => {
  try {
    const cliente = req.body;
    
    // Validación básica
    if (!cliente.id || !cliente.cedula || !cliente.nombres || !cliente.email) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: id, cedula, nombres, email'
      });
    }
    
    await saveRecord('clientes', cliente.id, cliente);
    
    res.json({
      success: true,
      message: 'Cliente guardado exitosamente',
      data: cliente
    });
    
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el cliente',
      detalle: error.message
    });
  }
});

// Guardar un producto
router.post('/productos', async (req, res) => {
  try {
    const producto = req.body;
    
    // Validación básica
    if (!producto.id || !producto.codigo || !producto.nombre || !producto.categoria) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: id, codigo, nombre, categoria, precio, stock'
      });
    }
    
    await saveRecord('productos', producto.id, producto);
    
    res.json({
      success: true,
      message: 'Producto guardado exitosamente',
      data: producto
    });
    
  } catch (error) {
    console.error('Error al guardar producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el producto',
      detalle: error.message
    });
  }
});

// Guardar un pedido
router.post('/pedidos', async (req, res) => {
  try {
    const pedido = req.body;
    
    // Validación básica
    if (!pedido.id || !pedido.codigo || !pedido.clienteId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: id, codigo, clienteId, fecha, subtotal, iva, total, estado'
      });
    }
    
    await saveRecord('pedidos', pedido.id, pedido);
    
    res.json({
      success: true,
      message: 'Pedido guardado exitosamente',
      data: pedido
    });
    
  } catch (error) {
    console.error('Error al guardar pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el pedido',
      detalle: error.message
    });
  }
});

// Guardar detalle de pedido
router.post('/detalle_pedido', async (req, res) => {
  try {
    const detalle = req.body;
    
    // Validación básica
    if (!detalle.id || !detalle.codigo || !detalle.productoId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: id, codigo, productoId, cantidad, detalle, precioUnit'
      });
    }
    
    await saveRecord('detalle_pedido', detalle.id, detalle);
    
    res.json({
      success: true,
      message: 'Detalle de pedido guardado exitosamente',
      data: detalle
    });
    
  } catch (error) {
    console.error('Error al guardar detalle:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el detalle',
      detalle: error.message
    });
  }
});

// ==================== ENDPOINT 3: LISTAR TODOS LOS REGISTROS ====================
// IMPORTANTE: Las rutas sin parámetros deben ir ANTES que las rutas con :id

// Listar todos los clientes
router.get('/clientes', async (req, res) => {
  try {
    const clientes = await getAllRecords('clientes');
    
    res.json({
      success: true,
      total: clientes.length,
      data: clientes
    });
    
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar los clientes',
      detalle: error.message
    });
  }
});

// Listar todos los productos
router.get('/productos', async (req, res) => {
  try {
    const productos = await getAllRecords('productos');
    
    res.json({
      success: true,
      total: productos.length,
      data: productos
    });
    
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar los productos',
      detalle: error.message
    });
  }
});

// Listar todos los pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await getAllRecords('pedidos');
    
    res.json({
      success: true,
      total: pedidos.length,
      data: pedidos
    });
    
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar los pedidos',
      detalle: error.message
    });
  }
});

// Listar todos los detalles de pedido
router.get('/detalle_pedido', async (req, res) => {
  try {
    const detalles = await getAllRecords('detalle_pedido');
    
    res.json({
      success: true,
      total: detalles.length,
      data: detalles
    });
    
  } catch (error) {
    console.error('Error al listar detalles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar los detalles',
      detalle: error.message
    });
  }
});

// ==================== ENDPOINT 4: OBTENER 1 REGISTRO (GET) ====================

// Obtener un cliente
router.get('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await getRecord('clientes', id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: `Cliente con ID ${id} no encontrado`
      });
    }
    
    res.json({
      success: true,
      data: cliente
    });
    
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el cliente',
      detalle: error.message
    });
  }
});

// Obtener un producto
router.get('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await getRecord('productos', id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: `Producto con ID ${id} no encontrado`
      });
    }
    
    res.json({
      success: true,
      data: producto
    });
    
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el producto',
      detalle: error.message
    });
  }
});

// Obtener un pedido
router.get('/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await getRecord('pedidos', id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: `Pedido con ID ${id} no encontrado`
      });
    }
    
    res.json({
      success: true,
      data: pedido
    });
    
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el pedido',
      detalle: error.message
    });
  }
});

// Obtener detalle de pedido
router.get('/detalle_pedido/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const detalle = await getRecord('detalle_pedido', id);
    
    if (!detalle) {
      return res.status(404).json({
        success: false,
        error: `Detalle con ID ${id} no encontrado`
      });
    }
    
    res.json({
      success: true,
      data: detalle
    });
    
  } catch (error) {
    console.error('Error al obtener detalle:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el detalle',
      detalle: error.message
    });
  }
});

module.exports = router;