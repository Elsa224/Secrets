require( "dotenv" ).config(); //to define environnement variables
const express = require( "express" );
const bodyParser = require( "body-parser" );
const mongoose = require( "mongoose" );
const session = require( "express-session" );
const passport = require( "passport" ); //using passport to add cookies and session
const passportLocalMongoose = require( "passport-local-mongoose" );

//Creating an app constant and use EJS as its view engine
const app = express( );
app.set( "view engine", "ejs" );
app.use( bodyParser.urlencoded( { extended: true } ) );

//app using modules ( express.static to load local files on the server, bodyParser )
app.use( express.static( `${ __dirname }/public` ) );

//Setting up our session
app.use( session( { 
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: false
} ) );

//Initialize passport
app.use( passport.initialize() );
app.use( passport.session() );

//Connect to the database
mongoose.connect( "mongodb://localhost:27017/userDB" );

//Schema
const Schema = mongoose.Schema;

const userSchema = new Schema( {
    email: {
        type: String,
        //required: [ true, "!! No email address specified !!" ]
    },
    password: {
        type: String,
        //required: [ true, "!! No password specified !!" ]
    }
} );

//Passport plugin
userSchema.plugin( passportLocalMongoose );

//Model
const User = mongoose.model( "User", userSchema );

//Configure passport local
passport.use( User.createStrategy() );

passport.serializeUser( User.serializeUser() );
passport.deserializeUser( User.deserializeUser() );

//Web Routes
app.get( "/", ( req, res ) => {
    res.render( "home" );
} );


app.get( "/register", ( req, res ) => {
    res.render( "register" );
} );


app.get( "/login", ( req, res ) => {
    res.render( "login" );
} );

app.get( "/secrets", ( req, res ) => {
    if( req.isAuthenticated() )
        res.render( "secrets" );
    else
        res.redirect( "/login" );
} );

app.get( "/logout", ( req, res ) => {
    req.logout();
    res.redirect( "/" );
} );

//POST /register
app.post( "/register", ( req, res ) => {
    User.register( { username: req.body.username }, req.body.password, ( error, user ) => {
        if( error ) {
            console.log( error );
            res.redirect( "/register" );
        }
        else {
            passport.authenticate( "local" )( req, res, () => {
                res.redirect( "/secrets" );
            } );
        }
    } );
   
} );

//POST /login
app.post( "/login", ( req, res ) => {
    const user = new User( {
        username: req.body.username,
        password: req.body.password
    } );

    //Use passport to login the user
    req.login( user, ( error ) => {
        if( error )
            console.log( error );
        else
            passport.authenticate( "local" )( req, res, () => {
                res.redirect( "/secrets" );
            } );

    } );
} );


let APP_PORT = process.env.PORT;
if ( APP_PORT == null || APP_PORT == "" )
    { APP_PORT = 3000 }

//Spin up the server
app.listen( APP_PORT, (  ) => {
    console.log( `Server has started successfully on port ${ APP_PORT }...\n` );
} );

