const { ObjectId } = require("mongodb")
const cartController = require("./cartController")
const wishlistController = require("./wishlistController")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const Order = require("../models/Order")
const Wallet = require("../models/Wallet")
const Category = require("../models/Category")
const PDFDocument = require('pdfkit')
const {format} = require("date-fns");
const Razorpay = require("razorpay")
const crypto = require('crypto')
var instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
})


const placeOrder = async(req,res)=>{
    try {
        const user_id = req.session.user._id
        const user = req.session.user
        const orderDetails = req.body
        let orderData
        const address = orderDetails.savedAddress.addressSelection
        const payment = orderDetails.order.payment_option
        const orderId = orderDetails.order.orderId
        let onlineSuccess = false
        let offerPrice, discount, i=0
        let status = payment === 'COD' ? 'placed': 'pending'

        //If it is a pending order
        if(orderId){
            orderData = await Order.findById(orderId)
            pendingOrderItems = await cartController.pendingOrderProducts(orderId)
            // console.log(orderData,"orderfjndskjvn")

            //update stock count
            pendingOrderItems.forEach((async product => {
                const updateStock = await Product.updateOne({_id: product.item},
                    {
                        //update stock
                        $inc: {countInStock:-product.quantity}
                    })
            }))
            offerPrice = orderData.totalAmount
            discount = orderData.discount
        }

        //New order
        else{
            let totalPrice = await cartController.getTotalAmount(user_id)

            const products = await getCartProductList(user_id)
            console.log("prod",products)
    
            const checkOffer = await Cart.findOne({user:user_id})
            // console.log("offer",checkOffer)
    
            if(checkOffer.offerPrice != 0){
                offerPrice = checkOffer.offerPrice
                discount =  checkOffer.discountPrice
            }else{
                //get total value of cart
                offerPrice = totalPrice.total
                discount = 0
            }
    
            //Custom order ID generation
            const generateOrderId = ()=>{
                const prefix = 'ORD'
                const timestamp = Date.now().toString(36)//to reduce length
                const randomString = Math.floor(Math.random() * 4);
    
                return `${prefix}${timestamp}${randomString}`
            }
    
            
    
                let orderObj = new Order({
                    orderId: ""+generateOrderId(),
                    deliveryDetails: address,
                    userId: new ObjectId(user_id),
                    paymentMethod: payment,
                    products: products,
                    totalAmount:offerPrice,
                    discount:discount,
                    status: status,
                })
    
                orderData= await orderObj.save()
                //Date formatting
                const formattedDate = format(new Date(orderObj.createdAt), 'yyyy-MM-dd HH:mm:ss');
                console.log(formattedDate);
        }

        //COD payment
        if(status === 'placed'){ 
            //update stock count
            orderData.products.forEach((async product => {
                const updateStock = await Product.updateOne({_id: product.item},
                    {
                        //update stock
                        $inc: {countInStock:-product.quantity}
                    })
            }))

             //If it is not a pending order
             if(!orderId){
                //clear cart
                const clearCart = await Cart.deleteOne({user:user._id})
                console.log("cleared")
            }
            res.status(200).json({codSuccess:true,data:orderData,orderedDate:formattedDate})
        }

        //online payment
        else if(orderData.status === 'pending'){

            offerPrice = parseInt((offerPrice*100).toFixed(2))
            console.log(offerPrice)
            instance.orders.create({
                amount: offerPrice,//to convert floating to integer
                currency: "INR",
                receipt: orderData.orderId
            },
                function (err,order){
                    if(err){
                        console.log(err)
                    }else{
                        // console.log("Razorpay order",order)
                        req.session.pendingId = orderId
                        res.json({order,onlineSuccess:true,data:orderData,orderedDate:formattedDate})
                    }
                    
                })

            // res.status(200).json({onlineSuccess:true,data:orderDetail,orderedDate:formattedDate})
        

        }  
    } catch (error) {
        console.log('error JSON',error)
    }
}

const verifyPayment = async(req,res)=>{
    try{
        console.log('payment and order details: ', req.body);
        const paymentDetails = req.body
        //to get payment method
        const payment = await instance.payments.fetch(paymentDetails.payment.razorpay_payment_id)
        console.log("paymentMethod",payment.method)
        let secret = process.env.KEY_SECRET
        let orders, orderId, updateStock
        let hash = crypto.createHmac('sha256', secret)
            .update(req.body.order.id + '|' + req.body.payment.razorpay_payment_id)
            .digest('hex')
        orderId = req.body.order.receipt

        if (hash === req.body.payment.razorpay_signature) {

            //update status
            orders = await Order.updateOne({ orderId: orderId },
                {$set:{status:'placed',paymentMethod:payment.method}})

            //update stock
            let order = await Order.findOne({orderId:orderId})
            updateStock =  order.products.forEach((async product => {
                const updateStock = await Product.updateOne({_id: product.item},
                    {
                        //update stock
                        $inc: {countInStock:-product.quantity}
                    })
            }))

            //If it is a pending order
            if(req.session.pendingId){
                delete req.session.pendingId
            }else{
                //clear cart   
                let userId = req.session.user._id 
                const clearCart = await Cart.deleteOne({user:userId})
            }

            res.json({ paymentSuccess: true })

        } else {
            orders = await Order.updateOne({ orderId: orderId },
                {$set:{status:'pending'}})
              
            res.json({ paymentSuccess: false })
        }

    } catch (error) {
        console.log(error.message);

    }
}

const orderSuccess = async(req,res) =>{
    try {
        console.log("hellooo")
        const user = req.session.user
        let cartCount = 0, wishlistCount = 0
        if(user){
            cartCount = await cartController.getCartCount(user._id)
            wishlistCount = await wishlistController.getWishlistCount(user._id)
        }
        //Need tochange
        const orderDetail = await Order.find({userId:user._id}).sort({createdAt:-1}).limit(1)
       console.log("4544",orderDetail)
        const catData = await Category.find({})
        
        res.render('orderSuccess',{user, cartCount, wishlistCount, categories:catData, orderId: orderDetail[0]._id})
    } catch (error) {
        console.log(error.message)
    }
}

const orderFaliure = async(req,res) =>{
    try {
        const user = req.session.user
        let cartCount = 0, wishlistCount = 0
        if(user){
            cartCount = await cartController.getCartCount(user._id)
            wishlistCount = await wishlistController.getWishlistCount(user._id)
        }
        //Need tochange
        const orderDetail = await Order.find({userId:user._id}).sort({createdAt:-1}).limit(1)
       
        const catData = await Category.find({})
      
        res.render('orderFailure',{user, cartCount, wishlistCount, categories:catData, orderId: orderDetail._id})
    } catch (error) {
        console.log(error.message)
    }
}

const getCartProductList = async(userId)=>{
    let cart = await Cart.findOne({user:new ObjectId(userId)})
    return cart.products
}

const getOrderTotalAmount = async(orderId) =>{
    try {
        const orderList = await Order.findOne({orderId:orderId})
        const totalVal = await Order.aggregate([
            // Match the session by session_id
            {
                $match:{_id: orderList._id}
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
        const totalValue = totalVal[0]
        return totalValue
        
    } catch (error) {
        console.log(error.message)
    }
}

const orderProductDetail = async(orderId) =>{
    try {
        const productDetails = await Order.aggregate([
            // Match the session by session_id
            {
                $match:{_id:orderId}
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
            },{
                $unwind: "$product"
            }
           
            ])
            return productDetails
    } 
    catch (error) {
        console.log(error.message)
    }
}

const orderDetail = async(req,res) =>{
    try {
        const orderId = req.query.id
        console.log(orderId)
        let user, cartCount = 0, wishlistCount = 0, orderDetails
        if(req.session.user){
            user = req.session.user
            cartCount = await cartController.getCartCount(user._id)
            wishlistCount = await wishlistController.getWishlistCount(user._id)
        }
        
        console.log(typeof(orderId))
        cartCount = await cartController.getCartCount(user._id)
        wishlistCount = await wishlistController.getWishlistCount(user._id)

        orderDetails = await Order.findById({_id:new ObjectId(orderId)})
        
        // const address = orderDetails[0].
        console.log(orderDetails)

        const formattedDate = format(new Date(orderDetails.createdAt), 'yyyy-MM-dd HH:mm:ss');
        console.log(formattedDate);

        const catData = await Category.find({})
        const productDetails = await orderProductDetail(orderDetails._id)
        // console.log(productDetails)
            const totalValue = await getOrderTotalAmount(orderDetails.orderId)
            console.log(totalValue.products)
            const sub = totalValue.products
            // console.log('*****',sub[1].orders[0])
            const discountPrice = orderDetails.totalAmount
            const total = totalValue.total
            const discount = orderDetails.discount
            console.log(orderDetails)
        
        res.render('orderDetail',{formattedDate, user, order:orderDetails, cartCount, wishlistCount, categories:catData, subtotal:sub, discountPrice, total, discount, products:productDetails})
    } catch (error) {
        console.log(error.message)
    }
}

const formattedDate = async(orders) =>{
    let date = []
    date = orders.forEach(order =>{
        date.push(format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'))
    console.log(date)

    })
    console.log(date)
    return date
}

const downloadInvoice = async(req,res) =>{
   try {
    const order = await Order.findOne({ _id: req.query.id });
    let pendingOrderItems = await cartController.pendingOrderProducts(req.query.id)
    let user = req.session.user
    console.log('user',user)
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        const pageWidth = 595;
        // Set response headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);

        // Pipe the PDF document to the response
        doc.pipe(res);
        // Add company logo
        doc.image("public/user_assets/assets/imgs/theme/gleenas.png", 50, 50, { width: 100 });

        // Add content to the PDF (this is a simple example)
        doc.fontSize(25).text('Invoice', 50, 150);
        doc.fontSize(18).text('Gleenas', pageWidth - doc.widthOfString('Gleenas') - 100, 60);
        doc.fontSize(12).text('Abc, City', pageWidth - doc.widthOfString('Abc, City') - 100, 85);
        doc.fontSize(12).text('Contact: +91-123456789', pageWidth - doc.widthOfString('Contact: +91-123456789') - 100, 100);
        doc.fontSize(12).text(`Order ID: ${order.orderId}`, 50, 200);
        doc.fontSize(12).text(`Name: ${user.name}`, 50, 220);
        doc.fontSize(12).text(`Payment method: ${order.paymentMethod}`, 50, 240);
        doc.fontSize(12).text(`Delivery details: ${order.deliveryDetails}`, 50, 260);

        // Table Headers
        doc.fontSize(12).text('Product Name', 50, 330);
        doc.fontSize(12).text('Quantity', 250, 330);
        doc.fontSize(12).text('Price', 450, 330);

        // Table Rows
        let rowY = 370, subtotal = 0
        pendingOrderItems.forEach(item => {
            doc.fontSize(11).text(item.product.name, 50, rowY);
            doc.fontSize(11).text(item.quantity, 250, rowY);
            doc.fontSize(11).text(item.product.price, 450, rowY);
             // Calculate subtotal
          subtotal += item.quantity * item.product.price;
            rowY += 20;
        });
        // Add subtotal, discount, tax, and total amount
        rowY += 20;
        const discount = order.discount || 0;
        const taxRate = 0; // example 0% tax rate
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount - discount;
        // Add subtotal, discount, tax, and total amount
        rowY += 20;

        // Calculate the x position for right alignment
        const rightX = pageWidth - 100; // 50 pixels from the right edge

        // Subtotal
        const subtotalText = `Subtotal: ₹${subtotal.toFixed(2)}`;
        doc.fontSize(11).text(subtotalText, rightX - doc.widthOfString(subtotalText), rowY);
        rowY += 20;

        // Discount
        const discountText = `Discount: -₹${discount.toFixed(2)}`;
        doc.fontSize(11).text(discountText, rightX - doc.widthOfString(discountText), rowY);
        rowY += 20;

        // Tax (assuming you want to display tax as 0% for now)
        const taxText = `Tax (0%): ₹${taxAmount.toFixed(2)}`;
        doc.fontSize(11).text(taxText, rightX - doc.widthOfString(taxText), rowY);
        rowY += 20;

        // Total Amount
        const totalAmountText = `Total Amount: ₹${totalAmount.toFixed(2)}`;
        doc.fontSize(14).text(totalAmountText, rightX - doc.widthOfString(totalAmountText), rowY);

        // Finalize the PDF and end the stream
        doc.end();
    
   } catch (error) {
    console.log(error.message)
   }
}

const orderList = async(req,res) =>{
    try {
            const orders = await Order.find({}).sort({createdAt:-1})
            res.render('orders',{orders:orders})
    } catch (error) {
        
    }
}

const cancelOrder = async(req,res)=>{
    try {
        const id = req.query.id
        const user = req.session.user
        const order = await Order.findById({_id:id})
        const status = order.status
        if(status === 'pending' || status === 'placed' ){
            const updated = await Order.findByIdAndUpdate({_id:id},{$set:{status:'cancelled'}})
        }

        order.products.forEach((async product => {
            const updateStock = await Product.updateOne({_id: product.item},
            {
                //update stock
                $inc: {countInStock:product.quantity}
            })
        }))

        const isWallet = await Wallet.findOne({userId:user._id})
        if(isWallet){
            const updateWallet = await Wallet.updateOne({userId:user._id},{
                $inc:{balance:order.totalAmount},
                $push:{ orders:{orderId: id,
                    amount: order.totalAmount }
                }})
            console.log("wallet",updateWallet)
        }else{
             const newWallet = new Wallet({
                userId: user._id,
                orders: {
                    orderId: id,
                    amount: order.totalAmount
                },
                balance: order.totalAmount
             })

             let walletObj = await newWallet.save()
             console.log("newwallet",walletObj)
        }
        res.redirect(`/view-order?id=${order.orderId}`)
    }
    catch (error) {
        console.log(error.message) 
     }
 
     
 }

 const returnOrder = async(req,res)=>{
    try {
        const id = req.query.id
        const order = await Order.findById({_id:id})
        const status = order.status
        const user = req.session.user
        if(status === 'delivered' ){
            const updated = await Order.findByIdAndUpdate({_id:id},{$set:{status:'returned'}})
        }

        order.products.forEach((async product => {
            const updateStock = await Product.updateOne({_id: product.item},
            {
                //update stock
                $inc: {countInStock:product.quantity}
            })
        }))

        const isWallet = await Wallet.findOne({userId:user._id})
        if(isWallet){
            const updateWallet = await Wallet.updateOne({userId:user._id},{
                $inc:{balance:order.totalAmount},
                $push:{ orders:{orderId: id,
                    amount: order.totalAmount }
                }})
            console.log("wallet",updateWallet)
        }else{
             const newWallet = new Wallet({
                userId: user._id,
                orders: {
                    orderId: id,
                    amount: order.totalAmount
                },
                balance: order.totalAmount
             })

             let walletObj = await newWallet.save()
             console.log("newwallet",walletObj)
        }

        res.redirect(`/view-order?id=${order.orderId}`)
    }
    catch (error) {
        console.log(error.message) 
     }
 
     
 }

const orderStatus = async(req,res)=>{
    try {
        const id = req.query.id
        const order = await Order.findById({_id:id})
        const status = order.status
        if(status === 'pending'){
            const updated = await Order.findByIdAndUpdate({_id:id},{$set:{status:'placed'}})
        }
        else if(status === 'placed'){
        const updated = await Order.findByIdAndUpdate({_id:id},{$set:{status:'delivered'}})
        }
        else if(status === 'delivered'){
            res.redirect('/admin/orders')
        }
        res.redirect('/admin/orders')
    } catch (error) {
       console.log(error.message) 
    }

    
}

const orderPlaced = async(req,res)=>{
    try {
        const id = req.query.id
        const updated = await Order.findByIdAndUpdate({_id:id},{$set:{status:'delivered'}})
        res.redirect('/admin/orders')
    } catch (error) {
       console.log(error.message) 
    }

    
}

const paginateOrders = async(req,res) =>{
        const page = parseInt(req.query.page) || 1; // Current page, default is 1
        const limit = parseInt(req.query.limit) || 10; // Items per page, default is 10
      
        try {
          // Fetch orders with pagination
          const orders = await Order.find().sort({createdAt:-1})
            .skip((page - 1) * limit)
            .limit(limit);
      
          // Get total number of orders for pagination
          const totalOrders = await Order.countDocuments();
      
          // Respond with paginated data and metadata
          res.json({
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
          });
        }
    catch(error){[
        console.log(error.message)
    ]}
}

const retryPayment = async(req,res) =>{
    try {
        const orderId = req.params.orderId
        const order = await Order.findById(orderId)
        res.redirect(`/proceed-to-checkout?id=${orderId}`)
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    placeOrder,
    orderSuccess,
    getCartProductList,
    getOrderTotalAmount,
    orderDetail,
    orderList,
    orderStatus,
    orderPlaced,
    orderProductDetail,
    verifyPayment,
    cancelOrder,
    formattedDate,
    paginateOrders,
    orderFaliure,
    returnOrder,
    retryPayment,
    downloadInvoice
}