const Product = require("../models/product");
const Cart = require("../models/cartModel");
const Address = require("../models/address");

module.exports.loadCart = async (req, res) => {
    try {
      const userId = req.session.user?._id;
      const product = await Cart.find({ user: userId }, { products: 1 }).populate(
        "products.productId"
      );
      const products = product[0]?.products;
      console.log(products, "cart");
      res.render("cart", { products: products });
    } catch (error) {
      console.log(error);
    }
  };


  module.exports.addToCart = async (req, res) => {
    try {
      const { productId, index, size, quantity } = req.body;
      const userId = req.session.user?._id;
      if (!userId) {
        return res.json({ user: true });
      }
  
      console.log(productId, index, userId, size, quantity);
  
      // price of the variant
      const product = await Product.findOne({ _id: productId });
      const price = product.variant[index].price;
      const offerPrice = product.variant[index].offerPrice;
      console.log(offerPrice, price);
      const qnt = quantity ? quantity : 1;
  
      if (userId) {
        const cart = await Cart.findOne({ user: userId });
        if (cart) {
          const exsisting = cart.products.filter(
            (product, i) => product.productId.toString() === productId
          );
          console.log(exsisting, " product");
          const exits = exsisting.find(
            (pro) => pro.product === index && pro.size === size
          );
          if (!exits) {
            console.log("addd");
            await Cart.findOneAndUpdate(
              { user: userId },
              {
                $push: {
                  products: {
                    productId: productId,
                    product: index,
                    price: offerPrice,
                    quantity: qnt,
                    totalPrice: offerPrice * qnt,
                    size: size,
                  },
                },
              }
            );
          } else {
            console.log("hello");
            return res.json({ already: true });
          }
        } else {
          console.log("created");
          console.log(price);
  
          const product = {
            productId: productId,
            product: index,
            price: offerPrice,
            quantity: qnt,
            totalPrice: offerPrice * qnt,
            size: size,
          };
          console.log(product);
  
          const cart = new Cart({
            user: userId,
            products: product,
          });
  
          if (cart) {
            await cart.save();
          }
        }
  
        res.json({ added: true });
      }
    } catch (error) {
      console.log(error);
    }
  };

  module.exports.removeFromCart = async (req, res) => {
    try {
      const userId = req.session.user?._id;
      const { productId, index, size } = req.body;
      console.log(req.body);
  
      if (userId) {
        const result = await Cart.updateOne(
          {
            user: userId,
            "products.productId": productId,
            "products.product": index,
            "products.size": size,
          },
          {
            $pull: {
              products: { productId: productId, product: index, size: size },
            },
          },
          {
            arrayFilters: [
              {
                "elem.productId": productId,
                "elem.product": index,
                "elem.size": size,
              },
            ],
          }
        );
        res.json({ removed: true });
      }
    } catch (error) {
      console.log(error);
    }
  };


  module.exports.changeQuantity = async (req, res) => {
    try {
      const { status, productId, index, size } = req.body;
      const userId = req.session.user?._id;
  
      if (!userId || !productId || index === undefined || !size) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
  
      const product = await Product.findOne({ _id: productId });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      const variant = product.variant[index];
      const stock = variant.stock;
      const price = variant.offerPrice;
  
      const cart = await Cart.findOne({ user: userId, "products.productId": productId });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      const cartProduct = cart.products.find(pro => pro.product === index && pro.size === size);
      if (!cartProduct) {
        return res.status(404).json({ error: 'Cart product not found' });
      }
  
      const quantity = cartProduct.quantity;
  
      if (status === "plus") {
        if (stock > quantity) {
          await Cart.updateOne(
            {
              user: userId,
              "products.productId": productId,
              "products.product": index,
              "products.size": size,
            },
            {
              $inc: { "products.$[elem].quantity": 1 },
              $set: { "products.$[elem].totalPrice": (quantity + 1) * price }
            },
            {
              arrayFilters: [{ "elem.productId": productId, "elem.product": index, "elem.size": size }]
            }
          );
        } else {
          return res.status(400).json({ error: 'Out of stock' });
        }
      } else if (status === "minus") {
        if (quantity > 1) {
          await Cart.updateOne(
            {
              user: userId,
              "products.productId": productId,
              "products.product": index,
              "products.size": size,
            },
            {
              $inc: { "products.$[elem].quantity": -1 },
              $set: { "products.$[elem].totalPrice": (quantity - 1) * price }
            },
            {
              arrayFilters: [{ "elem.productId": productId, "elem.product": index, "elem.size": size }]
            }
          );
        } else {
          return res.status(400).json({ error: 'Quantity cannot be less than 1' });
        }
      }
  
      res.json({ changed: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  


  module.exports.proceedToCheckout = async (req, res) => {
    try {
      const userid = req.session.user?._id;
      const address = await Address.findOne({ user: userid });
      console.log(address);
      const cart = await Cart.findOne({ user: userid }).populate(
        "products.productId"
      );
      console.log(cart);
      res.render("checkOut", { address: address, products: cart.products });
    } catch (error) {
      console.log(error);
    }
  };

  