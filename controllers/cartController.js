const { ObjectId } = require('mongodb')
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const User = require("../models/User")
const addressController = require("./addressController")
const wishlistController = require("./wishlistController")
const Category = require('../models/Category')
const Coupon = require('../models/Coupon')
const Order = require('../models/Order')


//to find products inside the cart
const cartProducts = async(userId)=>{
    try {
        const cart = await Cart.findOne({user:ObjectId.createFromHexString(userId)})
    
        const cartItems = await Cart.aggregate([
            // Match the session by session_id
            {
                $match:{_id: cart._id}
            },
            // Unwind the products array
            {
                $unwind: "$products"
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from: "products",
                    localField: "item",
                    foreignField:"_id",
                    as:"product"
                }
            },
            {
                $project:{
                    item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
                }
            }
           
            ])
            return cartItems
    } 
    catch (error) {
        console.log(error.message)
    }
   
}

const cartLoad = async(req,res)=>{
    try{
        
        let user = req.session.user
        let userId = req.session.user._id 
        const catData = await Category.find({block:false})
        let cartLength = 0, wishlistLength = 0, offerProd, cartItems,discount
        let totalValue, subTotal, coupon, discountTotal = 0,prodPrice

        if(user){
            cartLength = await getCartCount(userId)
            wishlistLength = await wishlistController.getWishlistCount(userId)
        }

         //If cart is empty
         if(cartLength===0){
            return res.render('cart',{ user:req.session.user, categories:catData, cartCount:0, wishlistCount:wishlistLength})
        }

        if(cartLength > 0){
            coupon = await Coupon.find({block:false})
            totalValue = await getTotalAmount(userId)
            subTotal = totalValue.products

             //reset applied coupons
             const offer = await Cart.updateOne({user:userId},{
                $set: {isInOffer:false, offerPercentage:0, offerPrice:0, discountPrice:0 }
            })

            //get products in cart
            cartItems = await cartProducts(userId)
            //to find all products in cart are available
            cartItems.forEach((async items => {
    
                //product added to cart but removed from db or blocked
                if(!items.product || items.product.block === true){
                    await Cart.findByIdAndUpdate({_id:items._id},{$pull:{products:{item:items.item}}})
                    cartItems = await cartProducts(userId)
                    cartLength = await getCartCount(userId)
                    // offerProd = await shopController.offerProd(cartItems)

                    if(cartLength===0){
                       return res.render('cart',{message:"The product is currently not available, sorry for the inconvience", user:user, categories:catData, cart:cartItems, cartCount:0, wishlistCount:wishlistLength })
                    }
                    
                    return res.render('cart',{message: items.product.name +" is removed", cart:cartItems, user:user, categories:catData,  cartCount:cartLength, wishlistCount:wishlistLength, total:totalValue.total, subtotal:sub})
                }
             }))
            
           //Apply discount for items in cart category offer/ product offer
            for(i=0; i<cartItems.length; i++){
                
                discountTotal = discountTotal + ((subTotal[i].orders[0].subtotal) * cartItems[i].product.discountApplied * 0.01)
                prodPrice = subTotal[i].orders[0].subtotal
                console.log("ind",prodPrice)
                console.log("ind",subTotal[i].orders[0].subtotal)

                discount = discountTotal.toFixed(2)
                // discountTotalPer = discountTotalPer + cartItems[i].product.discountApplied
            }
            if(discountTotal > 0){
                totalPrice = (totalValue.total- discountTotal).toFixed(2)
                discount = discountTotal.toFixed(2)
            }else{
                totalPrice = total.toFixed(2)
                discount = discountTotal.toFixed(2)
            }

            res.render('cart',{ cart:cartItems, user:user, coupon, cartCount:cartLength, wishlistCount:wishlistLength, categories:catData, total:totalValue.total, subtotal:subTotal, discount, prodPrice})    
                 
        } 
        
    }
    catch(error){
        console.log(error.message)
    }

}



//to find no: of products in cart
let count = 0

//function to calculate products in cart ajax
const getCartCount = async(userId)=>{
    try {
        
        const cart = await Cart.findOne({user:ObjectId.createFromHexString(userId)})
        let count = 0
        if(cart){
            count = cart.products.length
            return count
        }
        else{
            return count
        }
       
    } catch (error) {
        console.log(error.message)
    }
}

const addToCart = async(req,res)=>{
    try{
        const prodId = req.query.id
        console.log(prodId)
        var userId = req.session.user._id
        const userCart = await Cart.findOne({user: ObjectId.createFromHexString(userId)})
        const product = await Product.findById({_id:prodId}).populate({path:'category'}).exec()
        
        console.log(product.countInStock)
        let update, newCart

        if(product.countInStock > 0){
            if(userCart){
                const proId = new ObjectId(prodId)
                let proExist = userCart.products.findIndex(product => product.item.equals(proId))
                if(proExist != -1){
                    
                    const updateCart = await Cart.updateOne({user: ObjectId.createFromHexString(userId),'products.item': proId},
                    {
                        $inc: {'products.$.quantity':1}
                    }) 
                    // res.status(200).send({ success:true,message:"Cart product detail",data:updateCart }) 
                    // res.redirect('/userhome')
                    res.status(200).send({ success:true,message:"Cart product detail",data:updateCart,stock:product.countInStock, update:true })  
                }
                else{
                       const updateCart = await Cart.updateOne({user: ObjectId.createFromHexString(userId)},
                            {
                                $push:{ products: { item: proId,
                                    quantity: 1, createdAt: new Date()} }
                            }
                         )
                         res.status(200).send({ success:true,message:"Cart product detail",data:updateCart, stock:product.countInStock })  
                    }      
            }
            else{
               const cartobj = new Cart({
                user : ObjectId.createFromHexString(userId),  
                products: { item: new ObjectId(prodId),
                    quantity: 1}
                })
                
                newCart = await cartobj.save()
                res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock, newCart:true }) 

            }
        }else{
            res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock }) 
        }       
    }

    catch(error){
        res.status(400).send({success:false,message:error.message})
    }
}

const changeProductQuantity = async(req,res,next)=>{
    try {
        const details = req.body
        const count = parseInt(details.count)
        const quantity = parseInt(details.quantity)
        const maxLimit = parseInt(details.maxLimit)
        const stock = parseInt(details.stock)
        const userId = details.userId
        const product = await Product.findById({_id:details.productId})
        console.log("fsd",product)
        let maxBuyingLimit, outOfStock, updateQuantity, prodPrice
        //if product in cart is empty
        if (count === -1 && quantity === 1) {
            // console.log("remove")
            const updateCart = await Cart.updateOne({_id: new ObjectId(details.cartId)},
                {
                    $pull: { products: { item: new ObjectId(details.productId) }}
                })
                
                //console.log(updateCart)
                res.json({ success:true, removeProduct:true })
                // return res.removeProduct
        } else {
                updateQuantity = quantity+count
                console.log(updateQuantity)
                console.log(stock)
                if(updateQuantity <= stock){
                    if(updateQuantity <= maxLimit ){
                        const updateCart = await Cart.updateOne({_id: new ObjectId(details.cartId), "products.item": new ObjectId(details.productId)},
                        {
                            //increment or decrement based on count
                            $inc: {'products.$.quantity':count}
                        })
                        updateQuantity = quantity+count

                    }else{
                        updateQuantity = quantity
                        maxBuyingLimit = true
                    }
                }else{
                    updateQuantity = quantity
                    outOfStock = true    
                }

            
                let totalValue = await getTotalAmount(userId)
                let total = totalValue.total
                let subTotal = totalValue.products
                let cartItems = await cartProducts(userId)
                
                cartLength = await getCartCount(userId)
                if(cartItems){
                    let discountTotal = 0
                    for(i=0; i<cartItems.length; i++){
                        discountTotal = discountTotal + ((subTotal[i].orders[0].subtotal) * cartItems[i].product.discountApplied * 0.01)
                        discount = discountTotal.toFixed(2)
                        // discountTotalPer = discountTotalPer + cartItems[i].product.discountApplied
                        
                    
                    }
                    console.log("tot",discountTotal)
                    
                    if(discountTotal > 0){
                        console.log("tottt")
        
                        distotal = (totalValue.total- discountTotal).toFixed(2)
                        discount = discountTotal.toFixed(2)
                    }else{
                        distotal = totalValue.total.toFixed(2)
                        discount = discountTotal.toFixed(2)
                    }
            }
            prodPrice = (product.price * updateQuantity).toFixed(2)
                res.json({success:true, distotal, total, subtotal:subTotal, cartLength,discount, stock:product.countInStock, maxBuyingLimit, outOfStock, updateQuantity, prodPrice })

        }

    } catch (error) {
        next(error);
    }
}

const removeItem = async(req,res,next)=>{
    const details = req.body
   
            const removeProduct = await Cart.updateOne({_id: new ObjectId(details.cartId)},
            {
                $pull: { products: { item: new ObjectId(details.productId) }}
            })
            console.log(removeProduct)
                

            res.json({success:true})
        
}

//method to get total value of cart
const getTotalAmount = async(userId) =>{
    try {
        const cartList = await Cart.findOne({user:ObjectId.createFromHexString(userId)})
        const totalVal = await Cart.aggregate([
            // Match the session by session_id
            {
                $match:{_id: cartList._id}
            },
            // Unwind the products array
            {
                $unwind: "$products"
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity',
                    createdAt:'$products.createdAt'
                }
            },
            {
                $lookup:{
                    from: "products",
                    localField: "item",
                    foreignField:"_id",
                    as:"product"
                }
            },
            {
                $project:{
                    item:1, quantity:1, createdAt:1, product:{$arrayElemAt:['$product',0]}
                }
            },
            //string to numeric
            {
                $addFields: {
                  price: {
                    $cond: {
                      if: { $isNumber: { $toDouble: "$product.price" } },
                      then: { $toDouble: "$product.price" },
                      else: 0  // Default to 0 if not a number
                    }
                  },
                  quantityNumeric: {
                    $cond: {
                      if: { $isNumber: { $toDouble: "$quantity" } },
                      then: { $toDouble: "$quantity" },
                      else: 0  // Default to 0 if not a number
                    }
                  }
                }
              },
              {
                $addFields:{
                    subtotal:{ $multiply: ['$quantity','$price']}
                }
              },
             
              {
                $group:{
                    _id:'$item',
                    sub:{$sum:'$subtotal'},
                    details: { $push: "$$ROOT" }// $$ROOT- based on item ie productId group documents into array of details
                }        
             },
             {
                $sort:{'details.createdAt': 1}
              },
            {
                $group:{
                    _id:null,
                    total:{$sum:'$sub'},
                    products:{
                        $push:{
                            productId:'$item',
                            total:'$total',
                            orders:'$details'
                        }
                    }

                }        
             },
            
            
        ])
        //to get subtotal
        //console.log(totalVal[0].products[0].orders[0].sub)
        // console.log("price",totalVal[0].products[0].orders[0])
        const totalValue = totalVal[0]
        return totalValue
        
    } catch (error) {
        console.log(error.message)
    }
}

//Find products in pending order
const pendingOrderProducts = async(orderId)=>{
    try {
        const products = await Order.aggregate([
            { $match: { _id:ObjectId.createFromHexString(orderId) } },

            {
                $unwind:'$products'
            },

            {
                $project:{
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            },

            {
                $lookup:{
                    from:'products',
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },

            {
                $project:{
                    item:1, quantity:1, product:{ $arrayElemAt: ['$product', 0] }
                }
            }
        ])

        return products

    } catch (error) {
        console.log(error.message)
    }
}

const checkout = async(req,res) =>{
    try {
        let isPending = false, orderId = null
        let pendingOrder = null, pendingOrderItems = 0, subTotal
        let isProductUnavail = false
        let user = req.session.user
        let userId = req.session.user._id
        const catData = await Category.find({})
        let cartLength = 0, wishlistLength = 0, offerPrice, offerPercent=0, cartItems
        let totalValue = await getTotalAmount(userId)
        let discountTotal = 0, discountPercent = 0, discountTotalPer = 0, discountPrice = 0, totalPrice = 0

        if(user){
             cartLength = await getCartCount(userId)
             wishlistLength = await wishlistController.getWishlistCount(userId)

         }

          //to get updated addressIds
        user =  await User.findById({_id:userId})
        const addressIds = user.addressIds
        const addresses = await addressController.getMultiAddress(addressIds)
        

         //If it is a pending order
        if(req.query.id){
            subTotal = []
            orderId = req.query.id
            pendingOrder = await Order.findById(orderId)
            console.log("pending",pendingOrder)
            pendingOrderItems = await pendingOrderProducts(orderId)
            console.log(pendingOrderItems)

            // delete req.session.pendingOrderId

            if(pendingOrderItems.length > 0){
                isPending = true
                pendingOrderItems.forEach(async product => {
                
                    //product added to cart but removed from db or blocked
                    if(product.product.countInStock === 0 || product.product.block === true || !product.product){
    
                        await Order.findByIdAndUpdate({_id:orderId},{$pull:{ products: {item:product.item} }})
                        pendingOrder = await Order.findById(orderId)
                        console.log(pendingOrder.length)
                        pendingOrderItems = await pendingOrderProducts(orderId)
                        isProductUnavail = true
    
                    }
    
                    subTotal.push({
                        subtotal: product.product.price * product.quantity
                    })
                })
                total = pendingOrder.totalAmount + pendingOrder.discount
                discountTotal= pendingOrder.discount
                offerPrice = pendingOrder.totalAmount
                if(isProductUnavail && pendingOrderItems.length != 0){
                    console.log("333333")
    
                    return res.render('checkout',
                        {   
                            message:'Some of the products are not available',
                            wishlistCount:wishlistLength, 
                            pendingOrderItems, offerPrice:offerPrice, 
                            total:total, subtotal:subTotal, 
                            categories:catData, user:user, cartCount:cartLength, 
                            cart:pendingOrderItems, multiAddress:addresses, totalPrice, 
                            discountPrice:discountTotal, isPending, orderId
                        })
                }else{


                    res.render('checkout',
                        { 
                            wishlistCount:wishlistLength, 
                            pendingOrderItems, offerPrice:offerPrice, 
                            total:total, subtotal:subTotal, 
                            categories:catData, user:user, cartCount:cartLength, 
                            cart:pendingOrderItems, multiAddress:addresses, totalPrice, 
                            discountPrice:discountTotal, isPending, orderId
                        })  
                }
            }else{
                res.render('checkout',
                    { 
                        message:'Sorry, all the products are not available to complete payment',
                        wishlistCount:wishlistLength, 
                        user:user, cartCount:cartLength, multiAddress:addresses, pendingOrderItems,categories:catData, totalPrice, 
                        discountPrice:discountTotal, total:0, subtotal:subTotal, cart:pendingOrderItems, offerPrice:0, isPending, orderId
                        
                    })
            }

        }

         //if it is a new order
         else{
            //get products in cart
            cartItems = await cartProducts(userId)
            subTotal = totalValue.products
            if(cartItems){
                let discountTotal = 0
                for(i=0; i<cartItems.length; i++){
                    
                    discountTotal = discountTotal + ((subTotal[i].orders[0].subtotal) * cartItems[i].product.discountApplied * 0.01)
                    discount = discountTotal.toFixed(2)
                    // discountTotalPer = discountTotalPer + cartItems[i].product.discountApplied
                
                }

                if(discountTotal > 0){

                    totalPrice = (totalValue.total- discountTotal).toFixed(2)
                    discount = discountTotal.toFixed(2)
                }else{
                    totalPrice = total.toFixed(2)
                    discount = discountTotal.toFixed(2)
                }
            }

            const checkOffer = await Cart.findOne({user:userId})

            if(checkOffer.offerPrice != 0){
                offerPrice = (checkOffer.offerPrice).toFixed(2)
                discount =  (totalValue.total - offerPrice).toFixed(2)
                console.log(discount)
                discountTotal = discount
                offerPercent = checkOffer.offerPercentage
                const offer = await Cart.updateOne({user:userId},{
                    $set: {isInOffer:true, offerPercentage:offerPercent, offerPrice:offerPrice, discountPrice:discount }
                })
            }
            else{

                offerPrice =  totalPrice
                discountTotal = discount
                //get total value of cart
                const offer = await Cart.updateOne({user:userId},{
                    $set: {isInOffer:true, offerPercentage:discountPercent, offerPrice:totalPrice, discountPrice:discount }
                })
   
            }
            total = totalValue.total
            res.render('checkout',
                { 
                    wishlistCount:wishlistLength, 
                    pendingOrderItems, offerPrice:offerPrice, 
                    total:total, subtotal:subTotal, 
                    categories:catData, user:user, cartCount:cartLength, 
                    cart:cartItems, multiAddress:addresses, totalPrice, 
                    discountPrice:discountTotal, isPending, orderId
                })   
         }
         
        //subtotal=totalValue.products
        //  subtotal[i].orders[0].subtotal
           
    } catch (error) {
        console.log(error)
    }
   
}

module.exports = {
    cartLoad,
    getCartCount,
    addToCart,
    pendingOrderProducts,
    changeProductQuantity,
    removeItem,
    checkout,
    getTotalAmount,

}