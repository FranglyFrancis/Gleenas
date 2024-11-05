const User = require('../models/User')
const Category = require("../models/Category")
const Product = require("../models/Product")
const cartController = require("./cartController")
const wishlistController = require("./wishlistController")
const adminController = require("./adminController")
const bcrypt = require('bcrypt')

const securePassword = async(password)=>{
    try{

       const hashPassword= await bcrypt.hash(password,10)
       return hashPassword
    }
    catch(error){
        console.log(error.message)
    }
}

const homeLoad = async(req,res,next)=>{
    try{
       
        const catData = await Category.find({block:false})
        const prodData = await Product.find({block:false}).populate({path:'category', match : {block:false}}).exec();

        // const bestSellingProducts = await adminController.getBestSellingProducts(); // Aggregate query for products
        // console.log(bestSellingProducts)
        // const bestSellingCategories = await adminController.getBestSellingCategories(); // Aggregate query for categories
        // const totProducts = await Product.find({}).sort({updatedAt:-1})
        // const bestProducts = bestSellingProducts.map(item => item._id);// Extract product names
        // const bestProductsCount =  bestSellingProducts.map(item => item.totalSold) // Extract sales count
        // const bestCategories = bestSellingCategories.map(item => item._id);// Extract category names
        // const bestCategoriesCount =  bestSellingCategories.map(item => item.totalSold) // Extract sales count

        let  userId,user
        let cartLength = 0, wishlistLength = 0
        if(req.session.user){
            console.log("helooo")
            userId = req.session.user._id
            console.log(userId)
            user = await User.findById({_id:userId})  
            req.session.user =  user
            wishlistLength = await wishlistController.getWishlistCount(userId)
            cartLength = await cartController.getCartCount(userId)            
            res.render('home',{products:prodData, categories:catData, user:req.session.user, cartCount:cartLength, wishlistCount:wishlistLength ,
                               
            })
        }
    
    }
    catch(error){
        console.log(error.message)
    }
}


//login OTP
const otploginLoad = async(req,res)=>{
    try{
        
        if(req.session.isLoggedIn){
            res.redirect('/userhome')
        }
        else{
            res.render('loginOtp')
        }
    }
    catch(error){
        console.log(error.message)
    }

}


const registerLoad =  async(req,res)=>{
    try{
        res.render('register')
    }
    catch(error){
        console.log(error.message)
    }
}

const insertUser = async(req,res)=>{

    try{
        let { name,email,password } = req.body
        console.log(name)
        name = name.trim()
        console.log(name)
        email = email.trim()
        password = password.trim()

        //Validate form fields
        if(name == "" || email == "" || password ==""){
            res.render('register',{message: "Empty input fields"})
        } 
        else if(!/^[a-zA-Z]*$/.test(name)) {
            res.render('register',{message: "Invalid name"})
        }
        // else if(!/^[\w-\.] + @([\w-] + \.) + [\w-]{2,4}$/.test(email)){
        //     res.render('register',{message: "Invalid email"})
        // }
        else if (password.length < 8){
            res.render('register',{message: "Password is too short"})
        }else{ // Existing user or not
            const existingUser = await User.findOne({ email })
            if(existingUser){
                res.render('register',{message:"It seems you already have an account, please log in instead."})
            }
            else{
                //New user
                const encryptPassword = await securePassword(password)
                const newUser = new User({
                    name,
                    email,
                    password:encryptPassword,
                    is_admin:0
                })

                const saveUser = await newUser.save()
                if(saveUser){
                    req.session.isloggedIn = true
                    req.session.user = saveUser
                    res.render('login',{message:"Thank you for registering with us. Your registration has been successfully completed. Please login"})
                    // res.redirect('/userhome')
                }
                else{
                    res.render('login',{message:"Your registration has been failed"})
                }
            }
        }   
    }
    catch(error){
        console.log(error.message)
    }
}

//login user methods
const loginLoad = async(req,res)=>{
    try{
        if(req.session.isLoggedIn){
            res.redirect('/userhome')
        }else{
            res.render('login')
        }
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

                if(userData.is_admin === 1){
                    res.render('login',{message:'Email or password is incorrect'})
                }
                else{
                    req.session.isLoggedIn = true
                    req.session.user = userData
                                   
                    res.redirect('/userhome')
                }
            }else{
                res.render('login',{message:"It seems that Username or Password is incorrect. Please verify "})
            }

        }
        else{
                res.render('login',{message:"It seems that Username or Password is incorrect. Please verify "})
            }
    }
    catch(error){
        console.log(error.message)
    }

}


const userLogout = async(req,res)=>{
    try{
        swal("Are you sure")
        await req.session.destroy()
        res.clearCookie('usergleenas')
        console.log('logout')
        res.redirect('/login')
    }
    catch(error){
        console.log(error.message)
    }
}

const blockedUser = async(req,res)=>{
    try {
        const user = req.query.user
        const isBlock = await User.findByIdAndUpdate({_id:user._id},{
            $set:{block:true}
        })
        res.render('customers')
    } catch (error) {
        
    }
}
const unblockUser = async(req,res)=>{
    try {
        const user = req.session.user
        const isUnblock = await User.findByIdAndUpdate({_id:user._id},{
            $set:{block:false}
        })
        res.render('customers')
    } catch (error) {
        
    }
}

module.exports = {
    otploginLoad,
    registerLoad,
    insertUser,
    loginLoad,
    securePassword,
    verifyLogin,
    homeLoad,
    userLogout,
    blockedUser,
    unblockUser
    
}