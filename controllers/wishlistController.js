const { ObjectId } = require('mongodb')
const WishList = require("../models/Wishlist")
const Product = require("../models/productModel")
const User = require("../models/userModel")
const Category = require("../models/categoryModel")
const swal = require('sweetalert')
const Cart = require("../models/Cart")


const wishlistLoad = async(req,res)=>{
    try{
        let userId = req.session.user._id
        let wishlistLength = await getWishlistCount(userId)
       
        const catData = await Category.find({})
        let cartLength = await getCartCount(userId)
        let wishlistCount = await getWishlistCount(userId)
        if(wishlistCount === 0){
            return res.render('wishlist',{ user:req.session.user, categories:catData, wishlistCount:0, cartCount:cartLength})
         }else{
                let wishListItems = await wishlistProducts(userId)
                console.log("==",wishListItems)
                //to find all products in cart are available
                wishListItems.forEach((async items => {
    
                //product added to cart but removed from db or blocked
                if(!items.product || items.product.block === true){
                    await WishList.findByIdAndUpdate({_id:items._id},{$pull:{products:{item:items.item}}})
                    wishListItems = await wishlistProducts(userId)
                    wishlistLength = await getWishlistCount(userId)
                    if(wishlistLength === 0){
                       return res.render('wishlist',{message:"The product is currently not available, sorry for the inconvience", user:req.session.user, categories:catData, wishListItems, wishlistCount:0})
                    }
                    
                    return res.render('cart',{message: items.product.name +" is removed", wishListItems, user:req.session.user, categories:catData,  wishlistCount:wishlistLength })
                }
             }))
            
            
            res.render('wishlist',{ user:req.session.user, cartCount:cartLength, categories:catData, wishlistCount:wishlistLength, wishListItems })    
        }
    }
    
    catch(error){
        console.log(error.message)
    }
}

//----------Move to cart---------
const movetoCart = async(req,res)=>{
    try {
        const prodId = req.query.id
        console.log(prodId)
        var userId = req.session.user._id
        const userCart = await Cart.findOne({user: ObjectId.createFromHexString(userId)})
        const wishlist = await WishList.findOne({user: ObjectId.createFromHexString(userId)})
        const product = await Product.findById({_id:prodId})
        console.log(product.countInStock)
        let update, newCart

        if(product.countInStock > 0){
            if(userCart){
                const proId = ObjectId.createFromHexString(prodId)
                let proExist = userCart.products.findIndex(product => product.item.equals(proId))
                if(proExist != -1){
                    
                    const updateCart = await Cart.updateOne({user: ObjectId.createFromHexString(userId),'products.item': proId},
                    {
                        $inc: {'products.$.quantity':1}
                    }) 

                    const updateWishlist = await WishList.updateOne({user: ObjectId.createFromHexString(userId)},
                    {
                        $pull:{ products: { item: proId }}
                    })

                    console.log("***",updateWishlist)
                    // res.status(200).send({ success:true,message:"Cart product detail",data:updateCart }) 
                    // res.redirect('/userhome')
                    res.status(200).send({ success:true,message:"Product is added to cart",data:updateCart,stock:product.countInStock, update:true, updateWishlist })  
    
                }
                else{
                       const updateCart = await Cart.updateOne({user: ObjectId.createFromHexString(userId)},
                            {
                                $push:{ products: { item: proId,
                                    quantity: 1, createdAt: new Date()} }
                            }
                            
                         )
                         const updateWishlist = await WishList.updateOne({user: ObjectId.createFromHexString(userId)},
                         {
                             $pull:{ products: { item:proId }}
                         })
                         console.log("***",updateWishlist)
                         res.status(200).send({ success:true,message:"Cart product detail",data:updateCart, stock:product.countInStock, updateWishlist })  
                    }      
            }
            else{
               const cartobj = new Cart({
                user : ObjectId.createFromHexString(userId),  
                products: { item: ObjectId.createFromHexString(prodId),
                    quantity: 1}
                })
                const updateWishlist = await WishList.updateOne({user: ObjectId.createFromHexString(userId)},
                {
                    $pull:{ products: { item: ObjectId.createFromHexString(prodId) }}
                })
                console.log("***new",updateWishlist)
                
                newCart = await cartobj.save()
                res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock, newCart:true, updateWishlist }) 

            }
        }else{
            res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock, updateWishlist }) 
        }
    } catch (error) {
        console.log(error.message)
    }
}

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

//remove item
const removeItem = async(req,res)=>{
    const details = req.body
    console.log(details)
   
            const removeProduct = await WishList.updateOne({_id: new ObjectId(details.wishlistId)},
            {
                $pull: { products: { item: new ObjectId(details.productId) }}
            })
            console.log(removeProduct)
                

            res.json({
                success:true,

            })
        
}

//to get wishlist products
const wishlistProducts = async(userId)=>{
    const wishlist = await WishList.findOne({user:ObjectId.createFromHexString(userId)})
    let wishlistItems = await WishList.aggregate([
        {
            $match:{_id:wishlist._id}
        },
        {
            $unwind:"$products"
        },
        {
            $project:{
                item:"$products.item"
            }
        },
        {
            $lookup:{
                from:"products",
                localField:"item",
                foreignField:"_id",
                as:"product"
            }
        },
        {
            $project:{
                item:1,product:{$arrayElemAt:['$product',0]}
            }
        }
    ])
    console.log(wishlistItems)

    return wishlistItems
}

//function to calculate products in cart ajax
const getWishlistCount = async(userId)=>{
    try {
        
        const wishlist = await WishList.findOne({user:ObjectId.createFromHexString(userId)})
        let count = 0
        if(wishlist){
            count = wishlist.products.length
            return count
        }
        else{
            return count
        }
       
    } catch (error) {
        console.log(error.message)
    }
}

const addtoWishList = async(req,res)=>{
    try{
        const prodId = req.query.id
        console.log(prodId)
        var userId = req.session.user._id
        const userWishlist = await WishList.findOne({user: ObjectId.createFromHexString(userId)})
        const product = await Product.findById({_id:prodId})
        console.log(product.countInStock)
        let update, newCart

        if(product){
            if(userWishlist){
                const proId = new ObjectId(prodId)
                let proExist = userWishlist.products.findIndex(product => product.item.equals(proId))
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
                       const updateCart = await WishList.updateOne({user: ObjectId.createFromHexString(userId)},
                            {
                                $push:{ products: { item: proId,
                                    quantity: 1, createdAt: new Date()} }
                            }
                         )
                         res.status(200).send({ success:true,message:"Cart product detail",data:updateCart, stock:product.countInStock })  
                    }      
            }
            else{
               const Wishlistobj = new WishList({
                user : ObjectId.createFromHexString(userId),  
                products: { item: new ObjectId(prodId),
                    quantity: 1}
                })
                
                let newWishlist = await Wishlistobj.save()
                res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock, newCart:true }) 

            }
        }else{
            res.status(200).send({ success:true,message:"Cart product detail",data:newCart, stock:product.countInStock }) 
        }
        
    }
    catch(error){
        console.log(error)
    }
}

module.exports = {
    wishlistLoad,
    getWishlistCount,
    addtoWishList,
    removeItem,
    movetoCart
}