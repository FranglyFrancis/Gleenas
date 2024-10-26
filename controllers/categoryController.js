const Category = require("../models/categoryModel")
const { findByIdAndUpdate } = require("../models/userModel")
const {ObjectId} = require('mongodb');
var mongoose = require('mongoose');


const categoryList= async(req,res)=>{
    try {
    
        const categoryData = await getCategories()

        res.render('category',{categories:categoryData})
        
    } catch (error) {

        res.status(400).send({success:false,msg:error.message})
        
    }
}

const getCategories = async(req,res)=>{
    try {
        const categoryData = await Category.find({block:false})
        return categoryData
        
    } catch (error) {
        console.log(error.message)
    }
}

//Load category form
const addcategoryLoad = async(req,res)=>{
    try {
        res.render('addCategory')
    } 
    catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}


const addCategory = async(req,res)=>{
    try {
            let {name,discount} = req.body
            name.trim()
            if(name.length === 0){
                return res.render('addCategory', {message:'Invalid category'})
            }
            if(!req.file){
                return res.render('addCategory', {message:'Upload image'})
            }
            if(discount >= 50 || discount < 0){
                return res.render('addCategory', {message:'Please give a valid discount and below 50%'})
            }
            let catExist = await Category.findOne({name: {$regex:name, $options: 'i'}})
            if(!catExist){ 

                const category = new Category({
                        _id: new ObjectId(),
                        name,
                        discount,
                        image: req.file.filename,
                        block: false
                })
                const categoryData = await category.save()
                    
                if(categoryData){
                    res.redirect('/admin/category')
                }
                else{
                    return res.render('addCategory',{message: 'Something went wrong'})
                    }
            }
            else{
                    return res.render('addCategory',{message:"This category (" +req.body.name+ ") already exists."})
                }
    } 
    
    catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const editCategoryLoad = async(req,res)=>{
    try {
        const id = req.query.id
        const catData = await Category.findById({_id:id})
        
        if(catData){
            res.render('edit-category',{category:catData})
        }
        else{
            res.redirect('/admin/category')
        }

    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const updateCategories = async(req,res)=>{
    try {
            let {id,name,discount} = req.body
            const category = await Category.findById({_id:id})
            let catData
            if(discount >= 50){
                return res.render('edit-category',{category,message: 'Enter a discount less than 50%'})
            }
            if(req.file){
                        
                        catData = await Category.findByIdAndUpdate({_id:id},{ $set:{ name:name, discount:discount, image:req.file.filename } })
            }
            else{
                catData = await Category.findByIdAndUpdate({_id:id},{ $set:{ name:name , discount:discount} })
                
            }
            if(catData){
                res.redirect('/admin/category')
            }else{
                return res.render('edit-category',{category,message: 'Something went wrong'})
            }
        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const blockCategory = async(req,res)=>{

    const id = req.query.id
    const cat = await Category.findByIdAndUpdate({ _id:id },{$set:{ block:true }})
    res.redirect('/admin/category')
}

const unblockCategory = async(req,res)=>{
    const id = req.query.id
    await Category.findByIdAndUpdate({ _id:id },{ $set:{ block:false}})
    res.redirect('/admin/category')
}


const paginateCategory = async(req,res)=>{
    
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    try {
        //Fetch products
        const categories = await Category.find().sort({updated:-1})
        .skip((page-1)*limit)
        .limit(limit)
        
        console.log(categories)

        //Get total number of products
        const totalCategories = await Category.countDocuments()
        //Respond with paginated data
        res.json({
            categories,
            currentPage: page,
            totalPages: Math.ceil(totalCategories / limit)
        })
        
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    categoryList,
    addcategoryLoad,
    addCategory,
    editCategoryLoad,
    updateCategories,
    blockCategory,
    unblockCategory,
    getCategories,
    paginateCategory
}