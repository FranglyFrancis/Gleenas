const User = require("../models/userModel")
const Order = require("../models/Order")
const Product = require('../models/productModel')
const orderController = require('../controllers/orderController')
const bcrypt = require("bcrypt")
const randomString = require("randomstring")

const securePassword = async(password)=>{
    try{

       const hashPassword= await bcrypt.hash(password,10)
       return hashPassword
    }
    catch(error){
        console.log(error.message)
    }
}

const loginLoad =async(req,res)=>{
    try{

        res.render('login')
    }

    catch(error){

        console.log(error.message)
    }

}

const verifyLogin = async(req,res)=>{
    try{
        const {email,password} = req.body

        const userData = await User.findOne({email:email})
        if(userData){

            const matchPassword = await bcrypt.compare(password,userData.password)

            if(matchPassword){

                if(userData.is_admin === 0){
                    res.render('login',{message:'Email or password is incorrect'})
                }

                else{
                    req.session.user_id = userData._id
                    res.redirect('/admin/home')
                }
            } else{

                res.render('login',{message:'Login credentials are incorrect'})
            }
        }

        else{
            res.render('login',{message:'Login credentials are incorrect'})
        }
    }

    catch(error){
        console.log(error)
    }
}

const dashboardLoad = async(req,res)=>{
    const { startDate, endDate, period } = req.query;

    let query = {};

    // Date filters based on the period or custom date range
    if (period) {
        const now = new Date();
        if (period === 'day') {
            query.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lt: new Date(now.setHours(23, 59, 59, 999)) };
        } else if (period === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            query.createdAt = { $gte: startOfWeek, $lt: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            query.createdAt = { $gte: startOfMonth, $lt: new Date(endOfMonth.setHours(23, 59, 59, 999)) };
        }
    } else if (startDate && endDate) {
        query.createdAt = { $gte: new Date(startDate), $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
    }

    
    try{
        const orders = await Order.find(query);
        req.session.salesReportData = orders;
        // Calculate the required metrics
        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
        const userData = await User.findOne({_id:req.session.user_id})
        const bestSellingProducts = await getBestSellingProducts(); // Aggregate query for products
        const bestSellingCategories = await getBestSellingCategories(); // Aggregate query for categories
        const totProducts = await Product.find({})
        const bestProducts = bestSellingProducts.map(item => item._id);// Extract product names
        const bestProductsCount =  bestSellingProducts.map(item => item.totalSold) // Extract sales count
        const bestCategories = bestSellingCategories.map(item => item._id);// Extract category names
        const bestCategoriesCount =  bestSellingCategories.map(item => item.totalSold) // Extract sales count
         // If it's an AJAX request (for charts), return JSON data
         if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({
                admin:userData,
                bestProducts,
                bestProductsCount,
                bestCategories,
                bestCategoriesCount,
                sales:totalSalesCount, revenue:totalOrderAmount.toFixed(2),
                totProducts, discount:totalDiscount.toFixed(2),
                startDate,
                endDate,
                period
            });
        }else{
            // Render the report
            res.render('home', {
                admin:userData,
                bestProducts,
                bestProductsCount,
                bestCategories,
                bestCategoriesCount,
                sales:totalSalesCount, revenue:totalOrderAmount.toFixed(2),
                totProducts, discount:totalDiscount.toFixed(2),
                startDate,
                endDate,
                period
            });
        }
  
    }
    catch(error){
        console.log(error.message)
    }
}

// Aggregate query for products
const getBestSellingProducts = async()=>{
    try{
        const products = await Order.aggregate([
            { $unwind: "$products" },
            { $lookup: { 
                from: "products", 
                localField: "products.item", 
                foreignField: "_id", 
                as: "productDetails"
            }},
            { $unwind: "$productDetails" },
            { $group: { 
                _id: "$productDetails.name", 
                totalSold: { $sum: "$productDetails.quantity" } 
            }},
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
          ]);
          return products
    }
    catch(error){
        console.log(error.message)
    }
}


  // Aggregate query for categories
  const getBestSellingCategories = async()=>{
    try {
            const categories = await Order.aggregate([
                { $unwind: "$products" },
                { $lookup: { 
                    from: "products", 
                    localField: "products.item", 
                    foreignField: "_id", 
                    as: "productDetails"
                }},
                { $unwind: "$productDetails" },
                { $lookup: { 
                    from: "categories", 
                    localField: "productDetails.category", 
                    foreignField: "_id", 
                    as: "productCatDetails"
                }},
                { $unwind: "$productCatDetails" },
                { $group: { 
                    _id: "$productCatDetails.name", 
                    totalSold: { $sum: "$products.quantity" }
                }},
                { $sort: { totalSold: -1 } },
                { $limit: 10 }
              ]);
              return categories
    } catch (error) {
        console.log(error.message)
        
    }
  }
  
  

const logout = async(req,res,next)=>{
    try{

        req.session.destroy()
        res.redirect('/admin')
    }
    catch(error){
        console.log(error.message)
    }
}

const customersLoad = async(req,res)=>{
    try{

        var search =''
        if(req.query.search){
            search = req.query.search
        }
        const usersData = await User.find({
            is_admin:0,
            $or:[
                {name:{ $regex:'.*'+search+'.*',$options:'i'}},
                {email:{ $regex:'.*'+search+'.*',$options:'i'}},
                {mobile:{ $regex:'.*'+search+'.*',$options:'i'}}
            ]
        })
        res.render('customers',{customers:usersData})
    }
    catch(error){
        console.log(error.message)
    }
}

//Customer Detail
const customerDetail = async(req,res)=>{
    try{
        const id = req.query.id
        const userData = await User.findById({_id:id})
        const orderDetails = await Order.find({userId:id})
        let promises,results
        orderDetails.forEach((async(orderDetail)=>{
            let orderId = orderDetail._id
            let orderIds = []
            orderIds.push(orderId)
            console.log(orderIds)
            promises = orderIds.map(orderId=>orderController.orderProductDetail(orderId))
            results = await Promise.all(promises)
            console.log(results)
           
        }))
        
       
        if(userData){
            res.render('customerDetail',{user:userData, orders:orderDetails, products:results})
        }
        else{
            res.redirect('/admin/customers')
        }
        
    }
    catch(error){
        console.log(error.message)
    }
}

const blockUser = async(req,res)=>{
    try {
        const user_id = req.query.id
        await User.findByIdAndUpdate({_id:user_id},{
            $set:{
                block:true
            }
        })
        res.redirect('/admin/customers')
        
    } 
    catch (error) {
       return res.status(400).json({
        success:false,
        msg:error.message
       })
    }
}

const unblockUser = async(req,res)=>{
    try {
        const user_id = req.query.id
        await User.findByIdAndUpdate({_id:user_id},{
            $set:{
                block:false
            }
        })
        res.redirect('/admin/customers')
         // return res.status(200).json({
        //     success:true,
        //     msg:"Unblocked successfully"

        // })
    } 
    catch (error) {
       return res.status(400).json({
        success:false,
        msg: error.message
       })
    }
}

const paginateCustomers = async(req,res)=>{
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    try {
        //Fetch products
        const customers = await User.find().sort({updated:-1})
        .skip((page-1)*limit)
        .limit(limit)
        
        console.log(customers)

        //Get total number of products
        const totalCustomers = await User.countDocuments()
        //Respond with paginated data
        res.json({
            customers,
            currentPage: page,
            totalPages: Math.ceil(totalCustomers / limit)
        })
    } catch (error) {
        console.log(error.message)
    }
}



module.exports = {
    securePassword,
    loginLoad,
    verifyLogin,
    dashboardLoad,
    logout,
    customersLoad,
    blockUser,
    unblockUser,
    customerDetail,
    paginateCustomers
}


// const newUserLoad = async(req,res)=>{
//     try{
//         res.render('new-user')
//     }
//     catch(error){
//         console.log(error.message)
//     }
// }

// const addUser = async(req,res)=>{
//     try{
//         const {name, email, mobileno} = req.body
        
//         const image = req.file.filename
//         const password = randomString.generate(8)

//         const encryptPassword = await securePassword(password)
//         const user = new User({
//             name:name,
//             email:email,
//             mobile:mobileno,
//             image:image,
//             password:encryptPassword,
//             is_admin:0
//         })

//         const userData = await user.save()

//         if(userData){
//             res.redirect('/admin/customers')
//             res.send("Successfully submitted")
//         }
//         else{
//             res.render('new-user',{message:'Something went wrong'})
//         }
//     }
//     catch(error){
//         console.log(error.message)
//     }
// }



// const updateUsers = async(req,res)=>{
//     try{

//        const userData = await User.findByIdAndUpdate({_id:req.body.id},{$set:{name:req.body.name, email:req.body.email, mobile:req.body.mobileno }}).sort({updatedAt:-1})

//         if(userData){
//             res.redirect('/admin/customers')
//         }
//         else{
//             res.render('/admin/edit-user',{message:'Something went wrong'})
//         }
        
//     }
//     catch(error){
//         console.log(error.message)
//     }
// }

// const deleteUser = async(req,res)=>{
//     try{

//         const id = req.query.id
//         await User.deleteOne({_id:id})
//         res.redirect('/admin/dashboard')       
//     }
//     catch(error){
//         console.log(error.message)
//     }
// }