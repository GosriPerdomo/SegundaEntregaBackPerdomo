const express = require('express');
const router = express.Router();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Función para inicializar un carrito vacío
function initializeCart() {
  return {
    id: uuidv4(),
    products: []
  };
}

// Ruta POST /api/carts
router.post('/', (req, res) => {
  const newCart = initializeCart();

  fs.writeFile('carrito.json', JSON.stringify(newCart, null, 2), (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.status(201).json(newCart);
  });
});

// Ruta GET /api/carts/:cid
router.get('/:cid', (req, res) => {
  const cartId = req.params.cid;
  fs.readFile('carrito.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    const cart = JSON.parse(data);
    if (cart.id !== cartId) {
      res.status(404).json({ error: 'Carrito no encontrado' });
    } else {
      res.json(cart);
    }
  });
});

// Ruta POST /api/carts/:cid/product/:pid
router.post('/:cid/product/:pid', (req, res) => {
  const cartId = req.params.cid;
  const productId = req.params.pid;
  const quantity = req.body.quantity || 1; // Cantidad por defecto es 1

  fs.readFile('carrito.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    let cart;
    try {
      cart = JSON.parse(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    if (!cart || !cart.id) {
      cart = initializeCart();
    }

    if (cart.id !== cartId) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }

    const existingProduct = cart.products.find(prod => prod.id === productId);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ id: productId, quantity });
    }

    fs.writeFile('carrito.json', JSON.stringify(cart, null, 2), (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      res.json(cart);
    });
  });
});

module.exports = router;