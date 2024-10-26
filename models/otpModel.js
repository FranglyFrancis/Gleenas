const mongoose = require('mongoose')
const otpSchema =  new mongoose.Schema({
    email:{
        type:String,
        unique:true
    },
    otp:{
        type:String,
        unique:true
    }
},
{timestamps:true})

module.exports = mongoose.model('OTP',otpSchema)