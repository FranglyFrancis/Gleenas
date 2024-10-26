const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const cartController = require('./cartController')
const wishlistController = require('./wishlistController')
const categoryController = require('./categoryController')
const shopController = require('./shopController')
const Order = require('../models/Order')

const productList = async(req,res)=>{
    try {
      const productData = await getProducts()
      res.render('products',{products:productData})

    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const getProducts = async(req,res) =>{
    try {
            const productData = await Product.find({}).populate('category').sort({'updatedAt':-1})
            
            return productData
    } 
    catch (error) {
        res.status(400).send({success:false,msg:error.message})
        
    }
}
const addProductLoad = async(req,res)=>{
    try{
        const catData = await Category.find({block:false}) 
        console.log(catData)
        res.render('addProduct',{   categories:catData  })
    }
    catch(error){
        console.log(error.message)
    }
}

const addProduct = async(req,res)=>{
    try{
        const catData = await Category.find({block:false}) 

        var productImages = []
        for(let i=0; i<req.files.length; i++){
            productImages[i] = req.files[i].filename
        }

        let { name,description,category,quantity,unit,isFeatured,price,discount,countInStock }= req.body
        console.log(req.body)
        name = name.trim()

        let categoryRef = await Category.findOne({  name:category   })
        console.log(categoryRef)

        let categoryId = categoryRef._id

        //Validate form fields
        if(name.length===0){
            return res.render('addProduct',{categories:catData,message:"Invalid name"})
        }
        if(!/^[a-zA-Z]*$/.test(name)){
            return res.render('addProduct',{categories:catData,message:"Invalid name"})
        }
        
       
            const product = new Product({
                name,
                description,
                category:categoryId,
                quantity,
                unit,
                isFeatured,
                price,
                discount,
                countInStock,
                image:productImages   
            })

            console.log(product)
    
            const productData = await product.save()
    
            if(productData){
                res.redirect('/admin/products')
            }
        
         
    }
    catch(error){
        console.log(error.message)
    }
}


const productDetailLoad= async(req,res)=>{
    try{
        const id = req.query.id
        const catData = await Category.find({block:false})
        const productData = await Product.findById({_id:id}).populate('category')
        console.log(productData.image[0])
        const user = req.session.user
        const cartLength = await cartController.getCartCount(user._id)
        wishlistCount = await wishlistController.getWishlistCount(user._id)
        res.render('productDetail',{product:productData, user:user, categories:catData, cartCount:cartLength, wishlistCount})
    }
    catch(error){
        console.log(error.message)
    }
}

const editProductLoad = async(req,res)=>{
    try {
        const id = req.query.id
        const catData = await Category.find({ block:false })
        const productData = await Product.findById({_id:id}).populate('category').exec()
        console.log(productData)
        if(productData){
            res.render('edit-product',{ categories:catData, product:productData,id:id })
        }
        else{
            res.redirect('/admin/products')
        }

    } catch(error) {
        res.status(400).send({success:false,msg:error.message})
    }
}


const updateProducts = async(req,res)=>{
    try {
            let productImages = []
            for(let i=0; i<req.files.length; i++){
                productImages[i] = req.files[i].filename
            }
            let prodData 
            let { name,description,category,quantity,unit,price,discount,countInStock } = req.body
            if(countInStock<=0){
               return res.render('edit-product',{message:'Stock need not be empty',categories:catData,product:productData,id:id})
            }

            let categoryRef = await Category.findOne({name:category})
            let categoryId = categoryRef._id
            if(productImages){
                prodData = await Product.findByIdAndUpdate({_id:req.body.id},
                    { $set:{ 
                        name,
                        description,
                        category:categoryId,
                        quantity,
                        unit,
                        price,
                        discount,
                        countInStock,
                        image:productImages} })
            }
            else{
                prodData = await Product.findByIdAndUpdate({_id:req.body.id},
                    { $set:{ 
                        name,
                        description,
                        category:categoryId,
                        quantity,
                        unit,
                        price,
                        discount,
                        countInStock } })
               
                }
            if(prodData){
                res.redirect('/admin/products')
            }
        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}


const blockProduct = async(req,res)=>{

    const id = req.query.id
    await Product.findByIdAndUpdate({_id:id},{$set:{block:true}})
    res.redirect('/admin/products')
}

const unblockProduct = async(req,res)=>{
    const id = req.query.id
    await Product.findByIdAndUpdate({_id:id},{$set:{block:false}})
    res.redirect('/admin/products')
}

const searchProduct = async(req,res,next) =>{
    try {
        const userId = req.session.user._id
        const user = req.session.user
        let cartLength = 0, wishlistLength = 0, offerProd
        if(user){
            cartLength = await cartController.getCartCount(userId)
            wishlistLength = await wishlistController.getWishlistCount(userId)
        }
        const categories = await categoryController.getCategories()
        let searchQuery = req.query.q
        console.log(searchQuery)
        let catSearch = req.query.cat
        let totalProducts, query
        console.log(catSearch)
        let searchData = {}
        if(searchQuery){
            
            query = searchQuery
        console.log("ssssssc",query)

            // searchData = await Product.find({
            // "$or":[
            //         { "name": { $regex: ".*"+searchQuery+".*", $options: 'i'}},
            //         { "category": { $regex: ".*"+searchQuery+".*", $options: 'i'}}

            //     ]
            // ,'block':false})
            searchData = await Product.find({ "name": { $regex: ".*"+searchQuery+".*", $options: 'i'}, block:false}).populate({path:"category", block:false}).exec()
            searchData = searchData.filter(product => product.category)
            offerProd = await shopController.offerProducts(searchData)

            if(searchData.length === 0){
                searchData = await Product.find({block:false}).populate({path:"category", match:{"name": { $regex: ".*"+searchQuery+".*", $options: 'i'}}}).exec()
                searchData = searchData.filter(product => product.category)  
               //find offer in products
                offerProd = await shopController.offerProducts(searchData)
                console.log("oooo",offerProd)
            }
            totalProducts = searchData.length

        }else{
            swal("Products not found!")
        }
        
        if(catSearch){
            query = catSearch
            console.log("***",catSearch)
            // searchData = await Product.find({"category": { $regex: catSearch},"block":false})
            searchData = await Product.find({block:false}).populate({path:"category", match:{"name": { $regex: catSearch}}}).exec()
            searchData = searchData.filter(product => product.category)

            //find offer in products
            offerProd = await shopController.offerProducts(searchData)

            totalProducts = searchData.length

        }
        else{
            swal("Category not found!")
        }
       console.log(searchData)
        if(searchData.length > 0){
            //res.status(200).send({success:true,msg:"Product details",data:searchData})
           
            res.render('searchProducts',{ totalProducts, query, offerProd, products:searchData, searchQuery, cartCount:cartLength, wishlistCount:wishlistLength, user, categories })
        }
        else{
            swal("Products not found!")
            res.render('searchProducts',{ totalProducts, query, offerProd, products:searchData, searchQuery, cartCount:cartLength, wishlistCount:wishlistLength, user, categories })
        }
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}


//Not using bcoz it is post method
const filterProduct = async(req,res)=>{
    try {
       
        let sortQ = {}
        let searchQ = {}
        if (req.body.filterArray != undefined) {
            req.body.filterArray.forEach((keyword) => {

                if (keyword === 'all') {
                   sortQ = {}
                }
                if (keyword === 'newArrival') {
                    sortQ.createdAt = -1
                }
                if (keyword === 'low') {
                    sortQ.price = 1
                }
                if (keyword === 'high') {
                    sortQ.price = -1
                }
                if (keyword === 'asce') {
                    console.log("asc")
                    sortQ.name = 1
                }
                if (keyword === 'desce') {
                    sortQ.name = -1
                }
                if (keyword === 'popular') {
                    sortQ.quantity = -1
                }
                // if (keyword === 'rating') {
                //     sortQ.rating = -1
                // }
                if (keyword === 'featured') {
                    searchQ.featured = true
                }
                if (keyword === 'Masalas') {
                    searchQ.category = 'Masalas'
                }
                if (keyword === 'Dry fruits') {
                    searchQ.category = 'Dry fruits'
                }
                if (keyword === 'Flours') {
                    searchQ.category = 'Flours'
                }
                if (keyword === 'Pickles') {
                    searchQ.category = 'Masalas'
                }
                if (keyword === 'Spices') {
                    searchQ.category = 'Spices'
                }
            }
        )
        }

     
        let products = await Product.find(searchQ).sort(sortQ)
        console.log("*********",products)
        res.json(products)
    } catch (error) {
        console.log(error.message)
    }
}

const paginateProducts = async(req,res)=>{
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    try {
        //Fetch products
        const products = await Product.find().populate('category').sort({'updatedAt':-1})
        .skip((page-1)*limit)
        .limit(limit)
        
        console.log(products.length)


        //Get total number of products
        const totalProducts = await Product.countDocuments()
        //Respond with paginated data
        res.json({
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit)
        })
        
    } catch (error) {
        console.log(error.message)
        
    }
}

module.exports = {
    productList,
    addProductLoad,
    addProduct,
    productDetailLoad,
    editProductLoad,
    updateProducts,
    blockProduct,
    unblockProduct,
    searchProduct,
    filterProduct,
    paginateProducts
}