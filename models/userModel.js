const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({

    googleId:{
        type:String,
        required:false
    },
    name:{
        type:String,
        required:true,
        max:15
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    mobile:{
        type:String,
        max:10,
        default:0
    },
    image:{
        type:String,
        default:0
    },
    addressIds:[{
        type: mongoose.Schema.Types.ObjectId, ref:'Address'
    }],

    password:{
        type:String,
        min:7,
        max:15
        
    },
    is_admin:{
        type:Number,
        default:0
    },
    is_verified:{
        type:Number,
        default:0
    },
    block:{
        type:Boolean,
        default:false
    }

},
{timestamps:true}
)

module.exports = mongoose.model('User',userSchema)