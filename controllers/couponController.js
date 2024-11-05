const Coupon = require("../models/Coupon")
const Cart = require("../models/Cart")
const secureRandom = require('secure-random')
const cartController = require('./cartController')

const couponList = async(req,res)=>{
    try {
        const coupons = await Coupon.find({}).sort({updatedAt:1})
        res.render('coupons',{coupons:coupons})

    } catch (error) {
        console.log(error)
    }
}


const addCouponLoad = async(req,res)=>{
    try {
            res.render('addCoupon')
        }
        
    catch (error) {
        console.log(error)
    }
}

const generateCouponCode = (disPrice)=>{
    let code = 'GET'
    let bytes = secureRandom(2)
    let randomHex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    randomHex = randomHex.toUpperCase()
    return `${code}${disPrice}${randomHex}`
}

const addCoupon = async(req,res)=>{
    try {
        const {description,disPrice,minOrder} = req.body
        console.log(req.body)

        let couponCode = generateCouponCode(disPrice)

        const couponData = new Coupon({
            couponCode: couponCode,
            description: description,
            // expiryDate:date,
            discountPercent: disPrice,
            minOrderValue: minOrder
        })

        const newCoupon = await couponData.save()
        if(newCoupon){
            res.redirect('/admin/coupons')
        }else{
            console.log('something went wrong')
        }
        
    } catch (error) {
        console.log(error)
    }
}

const editCouponLoad = async(req,res)=>{
    try {
        const id = req.query.id
        const coupon = await Coupon.findById({_id:id})

        if(coupon){
            res.render('editCoupon',{ coupon, id:id })
        }
        else{
            res.redirect('/admin/coupons')
        }

    } catch(error) {
        res.status(400).send({success:false,msg:error.message})
    }
}

const editCoupon = async(req,res)=>{
    try {
        
        const couponId = req.params.id;
        const { description, discountPercent, minOrderValue } = req.body;
        let couponCode = generateCouponCode(discountPercent)

        const couponData = await Coupon.findByIdAndUpdate(couponId, { description, discountPercent, minOrderValue })

            res.redirect('/admin/coupons')
               
    } catch (error) {
        console.log(error.message)
    }
}

const blockCoupon = async(req,res)=>{
    try {
        const id = req.params.id
        const updatedCoupon = await Coupon.findByIdAndUpdate({_id:id},{
            $set:{block:true}
        })
        res.json({ message: "Coupon blocked successfully", coupon: updatedCoupon });
    } catch (error) {
        console.log(error.message)
    }
}

const unblockCoupon = async(req,res)=>{
    try {
        const id = req.params.id
        const updatedCoupon = await Coupon.findByIdAndUpdate({_id:id},{
            $set:{block:false}
        })
        res.json({ message: "Coupon unblocked successfully", coupon: updatedCoupon });

    } catch (error) {
        console.log(error.message)
    }
}

const verifyCoupon = async(req,res)=>{
    try {
        let userId = req.session.user._id
        let { code,total,discount } = req.body
        console.log("DFSDFS",discount)
        const checkOffer = await Cart.findOne({user:userId})
        code = code.trim()
        let coupon = await Coupon.findOne({ couponCode: code })
        if(!checkOffer.isInOffer){

            if(coupon === null){
                return res.json({ success:false, message: 'Coupon not found',total:total.toFixed(2),discount:discount.toFixed(2) })
            }
    
            if(coupon.status){ //If coupon is blocked
                return res.json({ success:false, message: 'Coupon is expired',total:total.toFixed(2),discount:discount.toFixed(2) })
            }
    
            if(total<coupon.minOrderValue){
                return res.json({ success:false, message: `Please update your cart above ${coupon.minOrderValue}`,total:total.toFixed(2),discount:discount.toFixed(2)})
            }

            discount = (total*(coupon.discountPercent*0.01) + discount).toFixed(2)
            total = (total - (total*(coupon.discountPercent*0.01))).toFixed(2)


            //Apply coupon
            const offer = await Cart.updateOne({user:userId},{
                $set: {isInOffer:true, offerPercentage:coupon.discountPercent, offerPrice:total, discountPrice: discount }
            })
           if(offer){
                res.json({success:true ,message: 'Coupon is applied', discount:coupon.discountPercent, discountPrice: discount, total:total })
           }
             
        }else{

            res.json({message: 'Coupon is already applied',discount:coupon.discountPercent, discountPrice: discount, total})
        }
       

        
    } catch (error) {
        res.status(500).json({message:'Server error',error})
    }
}

const removeCoupon = async(req,res) =>{
    try {
            let {code,total,discount} = req.body
            code = code.trim()
            const userId = req.session.user._id
    
            //find the applied coupon
            let coupon = await Coupon.findOne({ couponCode:code })

            if(coupon != null){
                // 1% of original price
                let oriPrice = (total/(100 - coupon.discountPercent) * 100).toFixed(2)
                            
                let newDiscount = (discount - (oriPrice * coupon.discountPercent/100)).toFixed(2)

                //reset applied coupons
                const offer = await Cart.updateOne({user:userId},{
                    $unset: {isInOffer:false, offerPercentage:0, offerPrice:0 }
                })

                if(offer){
                    res.json({success: true, message: 'Coupon removed successfully', newTotal:oriPrice, newDiscount})
                }else{
                    console.log("error")
                    res.json({success: false})
                }
            }else{
                res.json({success: false, message: 'Invalid coupon',newTotal:total.toFixed(2), newDiscount:discount.toFixed(2)})
            }
            
              
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: error.message });

    }
}

const paginateCoupons = async(req,res)=>{
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    try {
        //Fetch coupons
        const coupons = await Coupon.find({}).sort({updatedAt:-1})
        .skip((page-1)*limit)
        .limit(limit)
        //Get total number of coupons
        const totalCoupons = await Coupon.countDocuments()
        //Respond with paginated data
        res.json({
            coupons,
            currentPage: page,
            totalPages: Math.ceil(totalCoupons / limit)
        })
        
        
    } catch (error) {
        console.log(error.message)
    }
}

module.exports ={
    couponList,
    addCouponLoad,
    addCoupon,
    editCouponLoad,
    editCoupon,
    blockCoupon,
    unblockCoupon,
    verifyCoupon,
    removeCoupon,
    paginateCoupons

}