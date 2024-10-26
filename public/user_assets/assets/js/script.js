 function addToCart1(prodId){
    console.log("Button Clicked",prodId)
       $.ajax({
       url:'/addtocart?id=<%= prodId %>',
       method:'get',
       success:(response)=>{
       alert(response)
       }
      })
}