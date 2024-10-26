const express = require("express")
const session = require('express-session');
const mongoose = require("mongoose")
const MongoStore = require('connect-mongo');
const config = require('./config/config')

if(process.env.NODE_ENV !== "production"){
    require('dotenv').config()
}
const app = express()
const userRoute = require("./routes/userRoute")
const adminRoute = require("./routes/adminRoute")
const port = process.env.PORT
const mongoURI = process.env.CONNECTION_STRING
app.use('/',userRoute)
app.use('/admin',adminRoute)
app.use((req,res) => {
    res.render('Error/404')
})

app.set('view engine','ejs')
app.set('views','./views')

mongoose.connect(mongoURI)
    .then(() => {
        console.log('MongoDB connected successfully');

        // Set up session store using connect-mongo
        app.use(session({
        secret: config.sessionSecret, 
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: mongoURI,
            ttl: 14 * 24 * 60 * 60 // Session TTL (optional)
        }),
        }));

        // Start application
        app.listen(port, () => {
        console.log('Server is running');
        });
    })
  .catch(err => console.error('MongoDB connection error:', err));
