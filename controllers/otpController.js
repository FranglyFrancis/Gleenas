const User = require('../models/userModel')
const nodemailer = require('nodemailer')
const { google } = require('googleapis');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

// Your OAuth2 credentials
const { AUTH_EMAIL, AUTH_PASS, OTP_EXPIRATION_MINUTES } = process.env
const REDIRECT_URI = "http://localhost:4000/google/callback"

const bcrypt = require('bcrypt')
const userOtpVerification = require('../models/OTP')

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: AUTH_EMAIL,
        pass: AUTH_PASS,
    },
});

// Generate random OTP
function generateOTP() {
    let rand = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    console.log(rand)
    return rand
}

const sendOtp = async(req,res) => {
    try{
        const { email } = req.body;
        console.log(email)
        // Generate OTP and save to database
        const otpCode = generateOTP();
        console.log(otpCode)
        await userOtpVerification.deleteMany({ email }); // Remove any previous OTP records for the user
        const otpInstance = new userOtpVerification({ email, otp: otpCode });
        await otpInstance.save();
    
        // Send OTP via email
        const mailOptions = {
            from: AUTH_EMAIL,
            to: email,
            subject: otpCode,
            text: `Your OTP code is ${otpCode}. It will expire in ${OTP_EXPIRATION_MINUTES} minutes.`,
        };
    
        console.log(mailOptions)

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error.message)
                return res.status(500).json({ message: `Error sending OTP` });
            }
            res.status(200).json({ message: 'OTP sent successfully' });
        });
    }
    catch(error){
        console.log(error.message)
    }
}

// 
const verifyOtp = async(req,res) => {
    try{
        const { email, otp } = req.body;

        // Find OTP in the database
        const otpRecord = await userOtpVerification.findOne({ email, otp });
    
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    
        
        if(otpRecord){
            // If OTP is valid, remove the OTP record from the database
            console.log(otpRecord)
            //success
            const existingUser = await User.findOne({ email })
            await userOtpVerification.deleteOne({ _id: otpRecord._id });
            await userOtpVerification.deleteMany({ email })
            if(existingUser){
                req.session.isLoggedIn = true
                req.session.user = existingUser
                console.log("Verified")
                res.status(200).json({ message: 'OTP verified successfully',isLoggedIn:req.session.isLoggedIn,user:req.session.user  });
            }
            else{
                //New user 
                const newUser = new User({
                                            name: 'User',
                                            email:email,
                                            is_admin:0
                                        })
                const saveUser = await newUser.save()
                if(saveUser){
                    req.session.isLoggedIn = true
                    req.session.user = saveUser
                    res.status(200).json({ message: 'OTP verified successfully',isLoggedIn:req.session.isLoggedIn,user:req.session.user });
                }   
            }
        res.redirect('/userhome')
    
        // res.status(200).json({ message: 'OTP verified successfully' });
    }
}
    catch(error){
        console.log(error.message)
    }
}

const resendOtp = async(req,res) => {
    try{
        const { email } = req.body;

        // Generate new OTP and update in database
        const otpCode = generateOTP();
        await userOtpVerification.deleteMany({ email }); // Remove any previous OTP records for the user
        const otpInstance = new userOtpVerification({ email, otp: otpCode });
        await otpInstance.save();
    
        // Send new OTP via email
        const mailOptions = {
            from: AUTH_EMAIL,
            to: email,
            subject: 'Your New OTP Code',
            text: `Your new OTP code is ${otpCode}. It will expire in ${OTP_EXPIRATION_MINUTES} minutes.`,
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Error sending OTP' });
            }
            res.status(200).json({ message: 'New OTP sent successfully' });
        });
    }
    catch(error){
        console.log(error.message)
    }
}

//------------send otp-------------
// const generateOtp1 = async(req,res) =>{
//     try {
//         let email = req.body
//         email = email.email
//         email = email.trim()
//         console.log(email)
//         await userOtpVerification.deleteMany({email})
//         await sendMail(email)
//         //mail options
       
//         // res.json({
//         //     status: "PENDING",
//         //     message: "OTP sent successfully",
//         //     data: {
//         //         email    
//         //     }
//         // })
//         res.render('../partials/otpMessage', {message: "OTP sent successfully"})


//     } catch (error) {
//         res.json({
//             status: "FAILED",
//             message: error.message
//         })
//     }
// }


//------------Verify OTP---------------
// const authOtp = async( req,res )=>{
//     try {
//         let { email, otp } = req.body
//         email = email.trim()
//         otp = otp.trim()

//         if(!email || !otp){
//             throw Error(" Empty OTP details are not allowed")
//             //res.render('../partials/otpMessage', {message: "Empty otp details are not allowed"})
//         }else{
//             // const data = await userOtpVerification.find({})
//             // console.log(data)
//             const userOTPVerificationData = await userOtpVerification.find({ email:email })
//             console.log(userOTPVerificationData[0])

//             if( userOTPVerificationData.length <= 0){
//                 res.render('../partials/otpMessage', {message: "Code has expired. Please resend OTP"})

//             } else {
//                 //user OTP record exists
//                 const { expiredAt } = userOTPVerificationData[0]
//                 console.log(expiredAt)
//                 const hashedOTP = userOTPVerificationData[0].otp

//                 if( expiredAt < Date.now()) {
//                     //user OTP record has expired
//                     await userOtpVerification.deleteMany({ email })
//                     res.render('../partials/otpMessage', {message: "Code has expired. Please resend OTP"})
                    
//                 } else{
//                     console.log(otp,hashedOTP)
//                     const validOtp1 = await bcrypt.hash(otp,10)
//                     console.log(validOtp1,hashedOTP,otp)
                   
//                     const validOtp = await bcrypt.compare(otp, hashedOTP)
//                     console.log(validOtp)

//                     if(!validOtp){
//                         //entered OTP is wrong
//                         res.render('../partials/otpMessage', {message: "Invalid OTP, Please check"})

//                         // res.status(400).json(
//                         //     {message: "Invalid OTP, Please check"} 
//                         // )
//                     } else {
//                         if(validOtp){
//                             console.log("**",otp,hashedOTP)
//                             console.log(validOtp)
//                             //success
//                             const existingUser = await User.findOne({ email })
//                             await userOtpVerification.deleteMany({ email })
//                             if(existingUser){
//                                 req.session.isLoggedIn = true
//                                 req.session.user = existingUser
//                                 console.log("user created",req.isauthenticated())
//                                 console.log("Existing")
//                                 res.json({
//                                     message: 'successfully verified'
//                                 })
//                             }
//                             else{
//                                 //New user
                                
//                                 const newUser = new User({
//                                     name: 'User',
//                                     email:email,
//                                     is_admin:0
//                                 })
                
//                                 const saveUser = await newUser.save()
//                                 if(saveUser){
//                                     req.session.isLoggedIn = true
//                                     req.session.user = saveUser
//                                     console.log("user created",req.isauthenticated())
//                                     res.json({
//                                         message: 'successfully verified'
//                                     })
                           
//                                 }   
//                             }
                        
//                         }
//                     }
//                 }
//             }
//         } 
//     }

// catch (error) {
        
//         res.json({
//             status: "FAILED",
//             message: error.message,

//         })
//     }
// }


const resendOtp1 = async(req,res) => {
    try {
        let email = req.body
        email = email.email
        console.log(email)
        email = email.trim()
        if(email = ""){
            res.render('../partials/otpMessage', {message: "Empty values"})
        }
        else{
            await userOtpVerification.deleteMany({email})
            await sendMail(email)
            res.render('../partials/otpMessage', {message: "OTP sent successfully"})

        }
    } catch (error) {
        res.json({
            status:"FAILED",
            message: error.message
        })
    }
}

const forgotPassword = async(req,res) =>{

    try {
        let { email, otp } = req.body
        email = email.trim()
        console.log(email)
        otp = otp.trim()

        if(!email || !otp){
            throw Error(" Empty OTP details are not allowed")
            //res.render('../partials/otpMessage', {message: "Empty otp details are not allowed"})
        }else{
            // const data = await userOtpVerification.find({})
            // console.log(data)
            const userOTPVerificationData = await userOtpVerification.find({ email:email })
            console.log(userOTPVerificationData[0])

            if( userOTPVerificationData.length <= 0){
                res.render('../partials/otpMessage', {message: "Code has expired. Please resend OTP"})

            } else {
                //user OTP record exists
                const { expiredAt } = userOTPVerificationData[0]
                console.log(expiredAt)
                const hashedOTP = userOTPVerificationData[0].otp

                if( expiredAt < Date.now()) {
                    //user OTP record has expired
                    await userOtpVerification.deleteMany({ email })
                    res.render('../partials/otpMessage', {message: "Code has expired. Please resend OTP"})
                    
                } else{
                    console.log(otp,hashedOTP)
                    const validOtp1 = await bcrypt.hash(otp,10)
                    console.log(validOtp1,hashedOTP,otp)
                   
                    const validOtp = await bcrypt.compare(otp, hashedOTP)
                    console.log(validOtp)

                    if(!validOtp){
                        //entered OTP is wrong
                        res.render('../partials/otpMessage', {message: "Invalid OTP, Please check"})

                        // res.status(400).json(
                        //     {message: "Invalid OTP, Please check"} 
                        // )
                    } else {
                        if(validOtp){
                            console.log("**",otp,hashedOTP)
                            console.log(validOtp)
                            //success
                            const existingUser = await User.findOne({ email })
                            console.log(existingUser)
                            await userOtpVerification.deleteMany({ email })
                            if(existingUser){
                            console.log(email)

                                req.session.email = email
                                res.json({
                                    message: 'successfully verified'
                                })
                            }else{
                                    res.render('../partials/otpMessage', {message: "Invalid OTP, Please check"})
                                 }
                            }
                             
                        }
                        
                    }
                }
            }
        } 

catch (error) {
        
        res.json({
            status: "FAILED",
            message: error.message,

        })
    }
}



module.exports = {
    sendOtp,
    verifyOtp,
    resendOtp,
    forgotPassword

}

