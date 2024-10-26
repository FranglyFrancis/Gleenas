const { ObjectId } = require("mongodb")
const mongoose = require("mongoose")

const wishlistSchema = new mongoose.Schema({

    user:{
        type:ObjectId,
        required:true
    },
    products:{
        type:Array,
        required:true
    }
},{
    timestamps:true
})

module.exports = mongoose.model('Wishlist', wishlistSchema)