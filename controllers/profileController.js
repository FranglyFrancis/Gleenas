const cartController = require('./cartController.js')
const wishlistController = require('./wishlistController.js')
const addressController = require('./addressController.js')
const User = require('../models/userModel.js')
const Order = require('../models/Order.js')
const Wallet = require('../models/Wallet.js')
const Category = require('../models/categoryModel.js')



const profileLoad = async(req,res)=>{
    try {
       
        const userId = req.session.user._id
        const userData = await User.findOne({_id:userId})
        let cartLength = 0, wishlistLength = 0
        if(userId){
            cartLength = await cartController.getCartCount(userId)
            console.log(cartLength)
            wishlistLength = await wishlistController.getWishlistCount(userId)
            console.log(wishlistLength)
        }
        const getAddress = await addressController.getMultiAddress(userData.addressIds)
        const orderDetails = await Order.find({userId:userId})
        const catData = await Category.find({block:false})
        let wallet = await Wallet.findOne({userId:userId})
        console.log(userData)
        if(wallet === null){
            wallet = 0
            console.log(",sdgfhg",wallet)
            res.render('profile',{ user:userData, cartCount:cartLength, wishlistCount:wishlistLength, addresses:getAddress, categories:catData, orders:orderDetails, wallet})
        }else{
            res.render('profile',{ user:userData, cartCount:cartLength, wishlistCount:wishlistLength, addresses:getAddress, categories:catData, orders:orderDetails, wallet})
        }
   
    } catch(error){
        console.log(error.message)
    }
}

const filterOrders = async(req,res) =>{
    const page = parseInt(req.query.page) || 1; // Current page, default is 1
    const limit = parseInt(req.query.limit) || 10; // Items per page, default is 10
  
    try {
      // Fetch orders with pagination
      const userId = req.session.user._id
      console.log(userId)

      const orders = await Order.find({userId:userId}).sort({createdAt:-1})
        .skip((page - 1) * limit)
        .limit(limit);
        console.log(orders)
  
      // Get total number of orders for pagination
      let totalOrders = await Order.find({userId:userId});
      totalOrders = totalOrders.length
      // Respond with paginated data and metadata
      res.json({
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
      });
    }
catch(error){
    console.log(error.message)
}
}


// const profileImageEdit = async(req,res)=>{
//     try{
//         const user = req.session.user
//         const cartValue = await cartController.getCartCount(user._id)
//         const image = req.file.filename
//         const catData = await Category.find({})
//         const imageData = await User.updateOne({_id:user._id},{
//             $set:{image:image}
//         })
//         //res.render('profile',{user:userData, cartCount:cartValue, categories:catData, addresses:getAddress, orders:orderDetails} )
//         res.redirect('/profile')

//     }
//     catch(error){
//         console.log(error.message)
//     }
// }

const updateProfile = async(req,res) =>{
    try {
        const { name,mobile } = req.body
        console.log(mobile)
        const userId = req.session.user._id
        const update = await User.findByIdAndUpdate({_id:userId},{
            $set:{ name:name, mobile:mobile }})
        console.log(update)
        res.json({success:true,profileDetails:update})       
    } catch (error) {
        console.log(error.message)
    }
}


module.exports = {
    profileLoad,
    // profileImageEdit,
    filterOrders,
    updateProfile
}