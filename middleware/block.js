const isBlocked = async(req,res,next)=>{
    try {
         if(req.session.user){
            console.log(req.session.user.block)
            if(req.session.user.block === true){
                res.redirect('/blocked-user')
            }
            else{
                return next()
            }
        }
        else{
            return next()
        }
    } catch (error) {
        console.log(error.message)
    }
}
module.exports = {
    isBlocked
}