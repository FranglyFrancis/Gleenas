const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'users',
        required:true
    },
    orders:{
        type:Array,
        required:true
    },
    balance : {
        type:Number,
        default: 0,
    }
    
},{
    timestamps:true
})

module.exports = mongoose.model('Wallet',walletSchema)
