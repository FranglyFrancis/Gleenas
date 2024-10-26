const mongoose = require("mongoose")
const Product = require("../models/productModel")

const categorySchema = new mongoose.Schema({

    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    block:{
        type:Boolean,
        default:false
    },
    discount:{
        min:0,
        max:50,
        type:Number,
        default:0
    }
},
{timestamps:true}
)

module.exports = mongoose.model('Category',categorySchema)