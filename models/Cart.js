const { ObjectId } = require("mongodb")
const mongoose = require("mongoose")

const cartSchema = new mongoose.Schema({

    user:{
        type:ObjectId,
        required:true
    },
    products:{
        type:Array,
        required:true
    },
    isInOffer:{
        type:Boolean,
        default:0
    },
    offerPercentage:{
        type:Number,
        default:0
    },
    offerPrice:{
        type:Number,
        default:0
    },
    discountPrice:{
        type:Number,
        default:0
    }
},
{timestamps:true}
)

module.exports = mongoose.model('Cart',cartSchema)