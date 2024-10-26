const mongoose = require('mongoose')
const Category = require("../models/categoryModel")

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:false
    },
    category:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category'
    },
    quantity:{
        type:Number,
        min:1,
        required:true
    },
    unit:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true,
        min:1
    },
    discount:{
        type:Number,
        min:0,
        max:50
    },
    discountApplied:{
        type:Number,
        default:0
    },
    image:{
        type:Array,
        required:true
        
    },
    countInStock:{
        type:Number,
        min:0
    },
    maxLimit:{
        type:Number,
        default:10
    },
    isFeatured:{
        type:Boolean,
        default:0
    },
    block:{
        type:Boolean,
        default:false
    },
    rating:{
        type:Number,
        min:0
    }

},

{timestamps:true})

module.exports = mongoose.model('Product',productSchema)