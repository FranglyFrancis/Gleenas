const User = require('../models/User')
const Category = require("../models/Category")
const Product = require("../models/Product")
const cartController = require("./cartController")
const wishlistController = require("./wishlistController")
const { connect } = require('mongoose')

const shopLoad = async(req,res) =>{
    try {
        const user = req.session.user
        const userId = req.session.user._id
        let cartLength = 0,  wishlistLength = 0
        let updateOffer
        const products = await Product.find().populate('category').exec(); 
        if(user){
            cartLength = await cartController.getCartCount(userId)
            wishlistLength = await wishlistController.getWishlistCount(userId)

        }

        const categories = await Category.find({block:false});

        let prodData = await Product.find({'block':false}).populate({path:'category',match:{block:false}}).exec()

        //return maximum discount from product and category
        const offerProd = prodData.map(product => {
           const catDiscount = product.category ? product.category.discount : 0
           const prodDiscount = product.discount
            
           const maxDiscount = Math.max(catDiscount,prodDiscount) 
           const finalPrice = product.price - (product.price * maxDiscount * 0.01)  
           
           return {
            name: product.name,
            discount: finalPrice.toFixed(2),
            discountApplied: maxDiscount
           }
        })

//Apply category or product offer
        for(i=0;i<prodData.length;i++){         
                updateOffer = await Product.findByIdAndUpdate({_id:prodData[i]._id},{
                    $set: { discountApplied: offerProd[i].discountApplied}
                })
        }

        let totalProducts = prodData.length
    

        res.render('shop',{products:prodData, totalProducts:totalProducts, categories, 
                            user:user, cartCount:cartLength, wishlistCount: wishlistLength, offerProd})
    } catch (error) {
        console.log(error.message)
    }
}

const searchProductLoad = async(req,res) =>{
    try {
        const user = req.session.user
        const userId = req.session.user._id
        let cartLength = 0, wishlistLength = 0
        if(user){
            cartLength = await cartController.getCartCount(userId)
            wishlistLength = await wishlistController.getWishlistCount(userId)
        }
        const categories = await Category.find({block:false});

        let category = req.query.category
       
        let prodData = await Product.find({'category': req.query.category,'block':false})
        // console.log("........llll",prodData)
        let totalProducts = prodData.length
    

        res.render('searchProducts',{products:prodData, totalProducts:totalProducts,
                            user:user, cartCount:cartLength, wishlistCount:wishlistLength, categories, category })
    } catch (error) {
        console.log(error.message)
    }
}

const offerProducts = async(products) =>{
    try {
        offerProd = products.map(product => {
            const catDiscount = product.category ? product.category.discount : 0
            const prodDiscount = product.discount
             
            const maxDiscount = Math.max(catDiscount,prodDiscount)
            const finalPrice = product.price - (product.price * maxDiscount * 0.01)  
            
            return {
             name: product.name,
             discount: finalPrice.toFixed(2),
             discountApplied: maxDiscount
            }
         })
         
         return offerProd
        
    } catch (error) {
        console.log(error.message)
    }
}

const filterProduct = async(req,res) => {
    try {
        const categories = await Category.find({block:false});
        let catArray = []
        categories.forEach((category)=>{
            catArray.push(category.name)
        })

        // let prodData = await Product.find({category: {$in:catArray}})

        const user = req.session.user
        const userId = req.session.user._id
        let cartLength = 0 , wishlistLength = 0, offerProd
        if(user){
            cartLength = await cartController.getCartCount(userId)
            wishlistLength = await wishlistController.getWishlistCount(userId)

        }
        const page = parseInt(req.query.page) || 1;
console.log("queryy",req.query.page)

        let limit = 5;
        let skip = (page - 1) * limit;
        let filter = {};
        const sort = {};
        let totalProducts,products

        if(Object.keys(req.query).length != 0){
            if (req.query.category) {
                    console.log("category",req.query.category)
                    filter.category = req.query.category.split(',');
                    console.log('filter,',filter.category)
            }

            // if (req.query.minPrice) {
            //     filter.price = { $gte: parseFloat(req.query.minPrice) };
            // }
            // if (req.query.maxPrice) {
            //     filter.price = filter.price || {};
            //     filter.price.$lte = parseFloat(req.query.maxPrice);
            // }
            if (req.query.sortBy) {
                sort[req.query.sortBy] = req.query.sortOrder === 'asc' ? 1 : -1;
            }
    
            if(filter.category){
                filter = filter.category
                // console.log(filter)
                // totalProducts = await Product.countDocuments(filter);
                products = await Product.find({block:false}).populate({path:'category', match :{name: {'$in': filter}, block:false}}).sort(sort).exec();
console.log('prod',products)
                
                products = products.filter(product => product.category)
console.log('prod',products)
                //find offer in products
                offerProd = await offerProducts(products)

                totalProducts = await Product.find({block:false}).populate({path:'category', match :{name: {'$in': filter}, block:false}}).exec()
                totalProducts = totalProducts.filter(product => product.category)
                products = products.slice(skip, skip + limit);
                
            }
            else{
                products = await Product.find({block:false}).populate({path:'category', match : {block:false}}).sort(sort).exec();
                products = products.filter(product => product.category)
    console.log('prod',products)

                //find offer in products
                offerProd = await offerProducts(products)

                totalProducts = await Product.find({block:false}).populate({path:'category', match : {block:false}}).exec()
                totalProducts = totalProducts.filter(product => product.category)
                products = products.slice(skip, skip + limit);

            }
        }else{
            
                products = await Product.find({block:false}).sort(sort).limit(limit).skip(skip).populate({path:'category', match : {block:false}}).exec();
                products = products.filter(product => product.category)

                //find offer in products
                offerProd = await offerProducts(products)
                
                totalProducts = await Product.find({block:false}).populate({path:'category', match : {block:false}}).exec()
                totalProducts = totalProducts.filter(product => product.category)
        }

        res.json({
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts.length / limit),
            categories,
            cartCount:cartLength,
            wishlistCount:wishlistLength,
            totalProducts:totalProducts.length,
            user,
            offerProd
        });
}
        
catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    shopLoad,
    filterProduct,
    searchProductLoad,
    offerProducts
}