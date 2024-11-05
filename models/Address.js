const mongoose = require('mongoose')
const User = require('./User')

const addressSchema = new mongoose.Schema({
    user_id:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'users'
    },
    address:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true
    },
    pin:{
        type:Number,
        required:true,
        min:0
    }
},
{timestamps:true

})  

module.exports = mongoose.model('Address',addressSchema)