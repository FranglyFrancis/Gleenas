const GoogleStrategy = require('passport-google-oauth20').Strategy
const mongoose = require('mongoose')
const Guser = require('../models/userModel')

module.exports = function(passport){
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                callbackURL: '/google/callback',
                scope: ['profile','email']
            },
    async(accessToken, refreshToken, profile, done)=> {
        const newUser = {
            googleId: profile.id,
            name:profile.displayName,
            image:profile.photos[0].value,
            email:profile._json.email

        }

        try {
            // let user = await Guser.findOne({ googleId: profile.id })
            // console.log(user)
            // if(user){
            //     done(null,user)
            // } else{
            //     user = await Guser.create(newUser)
            //     done(null, user)
            // }

            let user
            //check user exists
            user = await Guser.findOne({ email:profile._json.email })
            if(user){
                //set googleID
                if(!user.googleId){
                    
                    userInfo = await Guser.updateOne({ email:profile._json.email },
                        {$set: { googleId: profile.id, image:profile.photos[0].value, name:profile.displayName }}
                    )
                    user = await Guser.findOne({ '$and':[ {email:profile._json.email} , {googleId:profile.id} ]  })
                    done(null,user)
                }else{
                    userInfo = await Guser.updateOne({ email:profile._json.email },
                        {$set: { image:profile.photos[0].value, name:profile.displayName }})
                        
                    user = await Guser.findOne({ '$and':[ {email:profile._json.email} , {googleId:profile.id} ]  })

                    done(null,user)
                }
            }
            
            else{
                
                user =  await Guser.findOne({ googleId:profile.id })
                if(user){
                    done(null,user)
                }else{
                    user = await Guser.create(newUser)
                    done(null, user)
                }
            }
        
        } catch (error) {
            
            console.log(error.message)
        }

    }
    )
)

    passport.serializeUser((user,done)=>{
        done(null,user.id)
    })

    passport.deserializeUser(async (id,done)=>{
        try {
            const user = await Guser.findById(id)
            if(user){
                done(null,user)
            }
  
        } catch (error) {
           console.log(error.message)
        }
    })

}