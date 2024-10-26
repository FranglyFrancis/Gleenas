
const isLogin = async(req,res,next)=>{
    try{
        
        if(req.session.isLoggedIn){
            console.log("Verified")
            return next()
        }
        else{
            res.redirect('/login')
        }
       
    }
    catch(error){
        console.log(error.message)
    }
}

const isLogout = async(req,res,next)=>{
    try{

        if(req.session.user){
            console.log("logged In")
            res.redirect('/userhome')
        }
        else{
            
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            return next()
        }
      
    }
    catch(error){
        console.log(error.message)
    }
}


module.exports = {
    isLogin,
    isLogout
}