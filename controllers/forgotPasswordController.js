const User = require('../models/userModel')
const userController = require('../controllers/userController')


const forgotPasswordLoad = async(req,res) => {
    try {
        const user = req.session.user
        if(req.session.loggedIn){
            res.redirect('/userhome')
        }else{
            res.render('forgotPassword')
        }
        
    } catch (error) {
        console.log(error.message)
    }
}

const resetPasswordLoad = async(req,res) =>{
    try{
        const email = req.session.email
        res.render('resetPassword',{email:email})
    }
    catch(error){
        console.log(error.message)
    }
}

const resetPassword = async(req,res) =>{
    try {
        const email = req.params.id
        console.log(email)
        const password = req.body.password
        const encryptPassword = await userController.securePassword(password)
        // console.log(encryptPassword)
        const resetPassword = await User.updateOne({email:email},{
            $set:{password:encryptPassword}
        })
        console.log(resetPassword)
        res.redirect('/login')
    } catch (error) {
        console.log(error.message)
    }
}


module.exports = {
    forgotPasswordLoad,
    resetPasswordLoad,
    resetPassword
}