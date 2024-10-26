const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    orderId:{
        type:String
    },
    deliveryDetails:{
        type:String,
        required:true
    },
    userId:{
        type:ObjectId,
        required:true
    },
    paymentMethod:{
        type:String,
        required:true
    },
    products:{
        type:Array,
        required:true
    },
    totalAmount:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        
    },
    status:{
        type:String,
        required:true
    },
    
    
},{
    timestamps:true
})

module.exports = mongoose.model('Order',orderSchema)