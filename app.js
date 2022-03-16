require( "dotenv" ).config(); //to define environnement variables
const express = require( "express" );
const bodyParser = require( "body-parser" );
const mongoose = require( "mongoose" );
const session = require( "express-session" );
const passport = require( "passport" ); //using passport to add cookies and session
const passportLocalMongoose = require( "passport-local-mongoose" );
const GoogleStrategy = require("passport-google-oauth20").Strategy; // OAuth with Google
const FacebookStrategy = require( "passport-facebook" ).Strategy; //OAuth with Facebook
const findOrCreate = require( "mongoose-findorcreate" );
const https = require("https");
const fs = require("fs"); //File System

const key = fs.readFileSync("C:\\Users\\Carmen\\localhost-key.pem"); //Certificate
const cert= fs.readFileSync("C:\\Users\\Carmen\\localhost.pem");

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
    },
    googleID: {
        type: String
    },
    facebookID: {
        type: String
    },
    secret: {
        type: String
    }
} );

//Plugins
userSchema.plugin( passportLocalMongoose );
userSchema.plugin( findOrCreate );

//Model
const User = mongoose.model( "User", userSchema );

//Configure passport local
passport.use( User.createStrategy() );

passport.serializeUser( (user, cb) => {
    process.nextTick( () => {
        cb( null, { id: user.id, username: user.username } );
    });
});

passport.deserializeUser( (user, cb) => {
    process.nextTick( () => {
        return cb( null, user );
    });
});

passport.use( new GoogleStrategy( { 
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://localhost:3000/auth/google/secrets",
    passReqToCallback: true,
    scope: [ "https://www.googleapis.com/auth/userinfo.profile" ]
    },( req, accessToken, refreshToken, profile, cb ) => {
        console.log( profile );
        User.findOrCreate({ googleID: profile.id }, (error, user) => {
            return cb(error, user);
        } );
    }
) );

passport.use( new FacebookStrategy( {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://localhost:3000/auth/facebook/secrets",
    passReqToCallback: true,
    }, ( req, accessToken, refreshToken, profile, cb ) => {
        console.log( profile );
        User.findOrCreate( { facebookID: profile.id }, ( error, user ) => {
            return cb( error, user )
        } );
    } 
) );

//Web Routes
app.get( "/", ( req, res ) => {
    res.render( "home" );
} );

app.get( "/auth/google", 
    passport.authenticate( "google", { scope: [ "https://www.googleapis.com/auth/userinfo.profile" ] } )  );

app.get( "/auth/google/secrets", 
    passport.authenticate( "google", { failureRedirect: "/login" } ), ( req, res ) => {
        //Successful authentication !! ✔️✔️😍 redirect to secrets
        res.redirect( "/secrets" );
    } );

app.get( "/auth/facebook",
    passport.authenticate( "facebook" , { scope: [ "public_profile", "email" ] } ) );

app.get( "/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" } ), (req, res) => {
        //Successful authentication !! ✔️✔️😍 redirect to secrets
        res.redirect("/secrets");
  } );

app.get( "/register", ( req, res ) => {
    res.render( "register" );
} );

app.get( "/login", ( req, res ) => {
    res.render( "login" );
} );

app.get( "/secrets", ( req, res ) => {
    User.find( { "secret": { $ne: null } }, ( error, foundUsers ) => { //secret field not equal to null
        if( error )
            console.log( error );
        else {
            if( foundUsers )
                res.render( "secrets", { usersWithSecrets: foundUsers } );      
        }
    } ); 
} );


app.route( "/submit" )
    .get( ( req, res ) => {
        if( req.isAuthenticated() )
            res.render( "submit" );
        else
            res.redirect( "/login" );
    } )

    .post( ( req, res ) => {    // Add a new secret
        const submittedSecret = req.body.secret;
        console.log( "The user info is : ", req.user );

        User.findById( req.user.id, ( error, foundUser ) => {
            if( error )
                console.log( error );
            else {
                if( foundUser ) {   //if we found the user,
                    foundUser.secret = submittedSecret ; //then save his secret in the document field
                    foundUser.save( () => {
                        res.redirect( "/secrets" );
                    } );
                }
            }
        } );
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

const server = https.createServer({ key, cert }, app);

server.listen( APP_PORT, () => {
    console.log( `Server has started successfully on https://localhost:${ APP_PORT }...\n` );
});