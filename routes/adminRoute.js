if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
const express = require("express")
const adminRoute= express()
const config = require("../config/config")
const multer = require('multer')
const path = require('path')
const bodyParser = require("body-parser")
const session = require("express-session")
const nocache = require('nocache')
const auth = require("../middleware/adminAuth") 
const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const productController = require('../controllers/productController')
const orderController = require('../controllers/orderController')
const couponController = require('../controllers/couponController')
const salesController = require('../controllers/salesController')


adminRoute.use(bodyParser.json())
adminRoute.use(bodyParser.urlencoded({extended:true}))
adminRoute.use(nocache())
adminRoute.use(session({
    name: 'usergleenas',
    secret:config.sessionSecret,
    resave:false,
    saveUninitialized:false  
}))
adminRoute.use(express.static('public'))
// Serve static files from the public directory
// adminRoute.use(express.static(path.join(__dirname, 'public')));

adminRoute.set('view engine','ejs')
adminRoute.set('views','./views/admin')


//Category images
const cat_storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/categoryImages'))
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname
        cb(null,name)
    }
})

const cat_upload = multer({storage:cat_storage})

//upload product images
const prod_storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/productImages'),function(err,success){
            if(err){
                throw err
            }
        })
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname
        cb(null,name,function(err,success){
            if(err){
                throw err
            }
        })
     }
})

const prod_upload = multer({storage:prod_storage})


adminRoute.get('/',auth.isLogout,adminController.loginLoad)
adminRoute.post('/',adminController.verifyLogin)
adminRoute.get('/home',auth.isLogin,adminController.dashboardLoad)
adminRoute.get('/filter-chart',auth.isLogin,adminController.filterChart)
adminRoute.get('/logout',auth.isLogin,adminController.logout)


//Category routes
adminRoute.get('/category',auth.isLogin,categoryController.categoryList)
adminRoute.get('/paginate-categories',auth.isLogin,categoryController.paginateCategory)
adminRoute.get('/add-category',auth.isLogin,categoryController.addcategoryLoad)
adminRoute.post('/add-category',auth.isLogin,cat_upload.single('image'),categoryController.addCategory)
adminRoute.get('/edit-category',auth.isLogin,categoryController.editCategoryLoad)
adminRoute.post('/edit-category',cat_upload.single('image'),categoryController.updateCategories)
adminRoute.get('/block-category',categoryController.blockCategory)
adminRoute.get('/unblock-category',categoryController.unblockCategory)

// Customer routes
adminRoute.get('/customers',auth.isLogin,adminController.customersLoad)
adminRoute.get('/paginate-customers',auth.isLogin,adminController.paginateCustomers)
adminRoute.get('/customerDetail',auth.isLogin,adminController.customerDetail)
adminRoute.get('/block-user',auth.isLogin,adminController.blockUser)
adminRoute.get('/unblock-user',auth.isLogin,adminController.unblockUser)

// Product routes
adminRoute.get('/products',auth.isLogin,productController.productList)
adminRoute.get('/paginate-products',auth.isLogin,productController.paginateProducts)
adminRoute.get('/add-product',auth.isLogin,productController.addProductLoad)
adminRoute.get('/productDetail',auth.isLogin,productController.productDetailLoad)
adminRoute.post('/add-product',prod_upload.array('image'),productController.addProduct)
adminRoute.get('/edit-product',auth.isLogin,productController.editProductLoad)
adminRoute.post('/edit-product',auth.isLogin,prod_upload.array('image'),productController.updateProducts)
adminRoute.get('/block-product',auth.isLogin,productController.blockProduct)
adminRoute.get('/unblock-product',auth.isLogin,productController.unblockProduct)

//order routes
adminRoute.get('/orders',auth.isLogin,orderController.orderList)
adminRoute.get('/pending-order',auth.isLogin,orderController.orderStatus)
adminRoute.get('/order-detail',auth.isLogin,orderController.orderDetail)
adminRoute.get('/paginate-orders',auth.isLogin,orderController.paginateOrders)

//coupon routes
adminRoute.get('/coupons',couponController.couponList)
adminRoute.get('/coupons/paginate',auth.isLogin,couponController.paginateCoupons)
adminRoute.get('/coupons-new',auth.isLogin,couponController.addCouponLoad)
adminRoute.post('/coupons-new',couponController.addCoupon)
adminRoute.get('/coupons-edit',couponController.editCouponLoad)
adminRoute.put('/coupons/:id',auth.isLogin,couponController.editCoupon)
adminRoute.patch('/coupons/:id/block',couponController.blockCoupon)
adminRoute.patch('/coupons/:id/unblock',couponController.unblockCoupon)

//Sales report
adminRoute.get('/sales-report',auth.isLogin,salesController.getSalesReport)
adminRoute.get('/download-excel',auth.isLogin,salesController.downloadExcel)
adminRoute.get('/download-pdf',auth.isLogin,salesController.downloadPdf)
adminRoute.get('/paginate-reports',auth.isLogin,salesController.paginateReports)

module.exports = adminRoute