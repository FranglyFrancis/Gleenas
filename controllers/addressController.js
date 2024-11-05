const Address = require("../models/Address")
const User = require("../models/User")

const addAddress = async(req,res)=>{
    try {
        const {address, city, state, pin} = req.body
        const userId =  req.session.user._id
        const addressData = new Address({
             user_id: userId,
             address: address,
             city: city,
             state: state,
             pin: pin     
        })
        const addressDetails = await addressData.save()
        console.log(addressDetails._id)
        const multiAddress = await User.updateOne({_id:userId},{$push:{addressIds:addressDetails._id}})
        console.log("---****",multiAddress)
        res.status(200).send({success:true,address:addressDetails})        
    } catch (error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const getaddressArray = async(addressId,addressArray)=>{
    try {
            const address = await Address.findOne({_id:addressId})
            addressArray.push(address)
            return addressArray
        }
    
    catch (error) {
        console.log(error.message)
    }
}

const getMultiAddress = async(addressIds)=>{
    try {
        console.log("AddressIds",addressIds)
        const addressArray = []
        if(addressIds.length > 0){
            const promises = addressIds.map(addressId=> getaddressArray(addressId,addressArray))
            const results = await Promise.all(promises)
            return results[0]
        }else{
            return 0
        }
        
        
    } catch (error) {
        console.log(error.message)
    }
}



module.exports = {
    addAddress,
    getMultiAddress,
    getaddressArray
}