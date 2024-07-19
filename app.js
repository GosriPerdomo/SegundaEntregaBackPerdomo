const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const productsRouter = require('./routes/products');
const cartsRouter = require('./routes/carts');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//configurar Handlebars
app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: false
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

//middleware para procesar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//rutas para los productos y carritos
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);

const readFileAsync = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    throw new Error('Error al leer el archivo');
  }
};

const writeFileAsync = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    throw new Error('Error al escribir el archivo');
  }
};

//ruta para renderizar la vista de productos en tiempo real
app.get('/realtimeproducts', async (req, res) => {
  try {
    const products = await readFileAsync('productos.json');
    res.render('realTimeProducts', { products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//ruta para renderizar la vista home con listado de productos
app.get('/', async (req, res) => {
  try {
    const products = await readFileAsync('productos.json');
    res.render('home', { products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// configuración de WebSocket
io.on('connection', async (socket) => {
  console.log('Cliente Conectado');

  //mostrar lista de productos
  try {
    const products = await readFileAsync('productos.json');
    socket.emit('productList', products);
  } catch (err) {
    console.error(err);
  }

  // manejar eventos de WebSocket para agregar y eliminar productos
  socket.on('newProduct', async (newProduct) => {
    try {
      const products = await readFileAsync('productos.json');
      const newProductId = uuidv4();
      const productToAdd = {
        id: newProductId,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price
      };
      products.push(productToAdd);
      await writeFileAsync('productos.json', products);
      io.emit('productList', products);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('deleteProduct', async (productId) => {
    try {
      let products = await readFileAsync('productos.json');
      products = products.filter(product => product.id !== productId);
      await writeFileAsync('productos.json', products);
      io.emit('productList', products);
    } catch (err) {
      console.error(err);
    }
  });
});

//manejador de errores para rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

//middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

//iniciar el servidor
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

