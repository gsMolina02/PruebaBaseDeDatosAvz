const redis = require('redis');

// Crear cliente de Redis
const client = redis.createClient({
  url: 'redis://localhost:6379'
});

// Manejar eventos de conexión
client.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

client.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

// Conectar a Redis
async function connectRedis() {
  try {
    await client.connect();
    console.log('Redis listo para usar');
  } catch (error) {
    console.error('Error al conectar a Redis:', error);
    process.exit(1);
  }
}

module.exports = { client, connectRedis };