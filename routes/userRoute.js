if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
const Swal = require('sweetalert')
const express = require('express')
const userRoute = express()
const mongoose = require('mongoose')
const partials = require('express-partials')
const bodyParser = require('body-parser')
const multer = require('multer')
const path = require('path')
const session = require('express-session')
const config = require('../config/config')
const {isLogin, isLogout} =  require('../middleware/auth')
const {isBlocked} =  require('../middleware/block')
// const auth = require('../middleware/auth')
const userController = require("../controllers/userController")
const shopController = require("../controllers/shopController")
const cartController = require("../controllers/cartController")
const profileController = require("../controllers/profileController")
const productController = require("../controllers/productController")
const passport = require('passport')
const addressController = require("../controllers/addressController")
const orderController = require("../controllers/orderController")
const otpController = require("../controllers/otpController")
const forgotPasswordController = require("../controllers/forgotPasswordController")
const wishlistController = require("../controllers/wishlistController")
const couponController = require('../controllers/couponController')

const MongoStore = require('connect-mongo')

//passport config
require('../config/passport')(passport)
userRoute.use(express.static('public'))
//set view engine
userRoute.set('view engine','ejs')
userRoute.set('views','./views/users')

userRoute.use(partials())
userRoute.use(bodyParser.json())

//all middlewares
//Middleware to parse JSOM and URL-encoded
userRoute.use(express.json())
userRoute.use(express.urlencoded({extended:true}))

userRoute.use(session({
    name: 'usergleenas',
    secret:config.sessionSecret,
    cookie:{maxAge:30000},
    cookie:{ secure: false },
    resave:false,
    saveUninitialized:false,  
    store: MongoStore.create({ mongoUrl: process.env.CONNECTION_STRING})  
}))

//passport middlewares(write below to session)
userRoute.use(passport.initialize())
userRoute.use(passport.session())

//user Images
const storage =  multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/userImages'))
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name)
    }
})
const upload = multer({storage:storage})


//New user register
userRoute.get('/register',isLogout,userController.registerLoad)
userRoute.post('/register',userController.insertUser)

//Password Login
userRoute.get('/login',isLogout,userController.loginLoad)
userRoute.post('/login',userController.verifyLogin)
userRoute.get('/forgot-password',isLogout,forgotPasswordController.forgotPasswordLoad)
// userRoute.post('/req-OTP',otpController.reqOTP)
userRoute.post('/verify-forgot-password',otpController.forgotPassword)
userRoute.get('/reset-password',isLogout,forgotPasswordController.resetPasswordLoad)
userRoute.post('/reset-password/:id',forgotPasswordController.resetPassword)

//OTP login
userRoute.get('/',isLogout,userController.otploginLoad)
// userRoute.post('/reqOTP',otpController.createOTP) 

userRoute.post('/send-otp',otpController.sendOtp) 
userRoute.post('/verify-otp',otpController.verifyOtp) 
userRoute.post('/resend-otp',otpController.resendOtp) 



//auth with google 
//GET 
userRoute.get('/google',isBlocked,isLogout,passport.authenticate('google', { scope: ['profile','email'] }))
//google auth callback
userRoute.get('/google/callback',passport.authenticate('google', {failureRedirect:'/login'}),
(req,res) => {
    const user= req.user
    req.session.isLoggedIn = true
    req.session.user = user
    res.redirect('/userhome')
})

//Logged in user routes
userRoute.get('/userhome',isLogin,isBlocked,userController.homeLoad)
userRoute.get('/logout',userController.userLogout)
userRoute.get('/blocked-user',userController.blockedUser)

//shop
userRoute.get('/shop',isLogin,isBlocked,shopController.shopLoad)
userRoute.get('/filter-product',isLogin,isBlocked,shopController.filterProduct)

//home category filter
userRoute.get('/search',isLogin,isBlocked,shopController.searchProductLoad)

//User profile
userRoute.get('/profile',isLogin,isBlocked,profileController.profileLoad)
userRoute.post('/profile',upload.single('image'),profileController.profileImageEdit)

//user address
userRoute.post('/add-address',addressController.addAddress)

//cart
userRoute.get('/cart',isLogin,isBlocked,cartController.cartLoad)
userRoute.post('/verify-coupon',couponController.verifyCoupon) //Apply coupon
userRoute.post('/remove-coupon',couponController.removeCoupon) //remove coupon
userRoute.get('/addtocart',isLogin,isBlocked,cartController.addToCart)
// userRoute.post('/addtocart',cartController.getCartCount)
userRoute.post('/change-product-quantity',cartController.changeProductQuantity)
userRoute.post('/remove-item',cartController.removeItem)
userRoute.get('/proceed-to-checkout',isLogin,isBlocked,cartController.checkout)
userRoute.post('/proceed-to-checkout',orderController.placeOrder)
userRoute.post('/verify-payment',orderController.verifyPayment)


//WishList
userRoute.get('/wishList',isLogin,isBlocked,wishlistController.wishlistLoad)
userRoute.get('/addtoWishList',isLogin,isBlocked,wishlistController.addtoWishList)
userRoute.post('/remove-item-wishlist',wishlistController.removeItem)
userRoute.get('/movetocart',isLogin,isBlocked,wishlistController.movetoCart)

//Wallet


//Orders
userRoute.get('/retry-payment/:orderId',isLogin,isBlocked,orderController.retryPayment)
userRoute.get('/order-success',isLogin,isBlocked,orderController.orderSuccess)
userRoute.get('/filter-order',isLogin,isBlocked,profileController.filterOrders)
userRoute.get('/order-failure',isLogin,isBlocked,orderController.orderFaliure)
userRoute.get('/cancel-order',isLogin,isBlocked,orderController.cancelOrder)
userRoute.get('/return-order',isLogin,isBlocked,orderController.returnOrder)
userRoute.get('/view-order',isLogin,isBlocked,orderController.orderDetail)
userRoute.get('/download-invoice',isLogin,isBlocked,orderController.downloadInvoice)

   
//products
userRoute.get('/search-product',isLogin,isBlocked,productController.searchProduct)
// userRoute.get('/filterList',isLogin,isBlocked,productController.filterProduct)
userRoute.get('/product-detail',isLogin,isBlocked,productController.productDetailLoad)

//All routes other than predefined
// userRoute.get('*',function(req,res){
//     try {
//          res.render('404')
//     }  
//     catch (error) {
    
//       console.log(error.message)
    
//    }
       
//  })


module.exports =  userRoute