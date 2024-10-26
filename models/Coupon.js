const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    couponCode:{
        type:String
    },
    description:{
        type:String,
        required:true
    },
    discountPercent:{
        min:0,
        max:60,
        type:Number,
        required:true
    },
    minOrderValue:{
        min:1,
        type:Number,
        required:true
    },
    // expiryDate:{
    //     type:Date,
    //     required:true
    // },
    block:{
        type:Boolean,
        default:false
    }

},
{timestamps:true})

module.exports = mongoose.model('Coupon',couponSchema)