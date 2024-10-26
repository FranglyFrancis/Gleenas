const mongoose = require("mongoose")

const otpVerificationSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    otp:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date
    },
    expiredAt :{
        type: Date
    }
})

const userOtpVerification = mongoose.model('userOtpVerification', otpVerificationSchema)

module.exports = userOtpVerification