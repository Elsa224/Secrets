require( "dotenv" ).config(); //to define environnement variables
const express = require( "express" );
const bodyParser = require( "body-parser" );
const mongoose = require( "mongoose" );
const bcrypt = require( "bcrypt" ); //Hashing password method - Bcrypt is more secure
const saltRounds = 10; //Sal

//Creating an app constant and use EJS as its view engine
const app = express( );
app.set( "view engine", "ejs" );
app.use( bodyParser.urlencoded( { extended: true } ) );

//app using modules ( express.static to load local files on the server, bodyParser )
app.use( express.static( `${ __dirname }/public` ) );

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


//Connect to the database
mongoose.connect( "mongodb://localhost:27017/userDB" );

//Schema and Model
const Schema = mongoose.Schema;

const userSchema = new Schema( {
    email: {
        type: String,
        required: [ true, "!! No email address specified !!" ]
    },
    password: {
        type: String,
        required: [ true, "!! No password specified !!" ]
    }
} );

//Encryption

const User = mongoose.model( "User", userSchema );

//POST /register

//Hashing the password
app.post( "/register", ( req, res ) => {
    bcrypt.hash( req.body.password , saltRounds, ( error, hash ) => {
    
        const newUser = new User( {  
            email: req.body.username,
            password: hash
        } );
    
        newUser.save( ( error ) => {
            if( error )
                console.log( "error: ", error );
            else    
                res.render("secrets");
    
        } );
    } );
} );

//POST /login
app.post( "/login", ( req, res ) => {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne( { email: username }, ( error, foundUser ) => {
        if( error )
            console.log( "error: ", error );
        else {
            if( foundUser ) {
                bcrypt.compare( password, foundUser.password, ( error, result ) => {
                    if( result === true )
                        res.render( "secrets" );
                } ) 
            }
        }
    } );

} );


let APP_PORT = process.env.PORT;
if ( APP_PORT == null || APP_PORT == "" )
    { APP_PORT = 3000 }

//Spin up the server
app.listen( APP_PORT, (  ) => {
    console.log( `Server has started successfully on port ${ APP_PORT }...\n` );
} );

