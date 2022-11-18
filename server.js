require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const ObjectId = require('mongodb').ObjectId;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: "our secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.mongourl, { useNewUrlparser: true });
// userDB", { useNewUrlparser: true });


// mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlparser: true });
// mongodb+srv://admin-rahul:@cluster0.nv2ihbl.mongodb.net/?retryWrites=true&w=majority
// mongodb+srv://<username>:<password>@cluster0.q6yoqjl.mongodb.net/?retryWrites=true&w=majority

// mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema({
    lastupdate: Date,
    name: String,
    username: String,
    email: String,
    phone: Number,
    password: String,
    googleId: String,
    post:String,
    
    mytodo:[],
    assignedtodo:[]

});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    })
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dash"

    
    // userProfileURL:"http://www.googleapis.com/oauth2/v3/userinfo"

},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);



        User.findOrCreate({ googleId: profile.id, username: profile.displayName, firstname: profile.name.givenName, lastName: profile.name.familyName }, function (err, user) {
            if (err) {
                res.render("errorpage", { message: err });
            }
            return cb(err, user);
        });
    }
));


app.get('/auth/google',
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/dash",
    passport.authenticate("google", { failureRedirect: "/?error=log" }),
    function (req, res) {
        // Successful authentication, redirect secrests page.
        res.redirect('/');
    });


// ----------------------------------G E T-----------------------------------------

app.get("/signin", function (req, res) {
    const response = req.query.error;
    // var x=req.isAuthenticated();
    const ack="";
        res.render("signin",{ack});
});


app.get("/dash",(req,res)=>{

    if(req.isAuthenticated()){
        res.render("home");

    }else{
        const ack="LIGIN FIRST";
        res.render("signin",{ack});
    }


})
app.get("/signup",(req,res)=>{
    res.render("signup");
})

app.get("/mentor",(req,res)=>{

    if (req.isAuthenticated()) {

        var accountuser;
        var userid = req.session.passport.user;
        User.findOne({ _id: userid }, function (err, data) {
            // console.log(data);
            if (err) {
                res.send(data);
            }
            else {
                if(data.post=='Mentor'){
                    
                    const mytodo=data.mytodo;

                res.render("mentor",{data,mytodo});
                }

                else{
                    res.redirect('/user');
                }
                
            }
        })


    }
    else {
        const ack="LIGIN FIRST";
        res.render("signin",{ack});
    }

})





app.get("/user",(req,res)=>{
     if (req.isAuthenticated()) {

        var accountuser;
        var userid = req.session.passport.user;
        User.findOne({ _id: userid }, function (err, data) {
            // console.log(data);
            if (err) {
                res.send(data);
            }
            else {
                const mytodo=data.mytodo;
                const assignedtodo=data.assignedtodo;
                if(data.post=='Mentor'){
                    res.redirect('/mentor');
                }

                else{
                    res.render("user",{data,mytodo,assignedtodo});

                }
            }
        })


    }
    else {
        const ack="Login first";
        res.render("signin",{ack});
    }
})

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            // console.log(err);
            res.send("error");

        }
        else {
            res.redirect("/signin");

        }
    });
});



app.get("/deletetodo", function (req, res) {
    const requestedUser = req.query.uid;
    const requestedPost = req.query.tid;
    if (req.isAuthenticated()) {

        // User.updateOne({ _id:requestedUser,mytodo:{$elemMatch:{userId:requestedPost}} },{$set:{status:{$eq:[false,"$status"]}}},
        //     { safe: true, multi: true }, (err) => {
        //     if (!err) {
            
        //         res.redirect(req.query.user);
        //     }
        //     else {
        //         console.log(err);
        //     }
        // }
        // );

        User.updateOne({ _id:requestedUser,mytodo:{$elemMatch:{userId:requestedPost}} },{$set:{status:true}},
            { safe: true, multi: true }, (err) => {
            if (!err) {
            
                res.redirect(req.query.user);
            }
            else {
                console.log(err);
            }
        }
        );

        // User.findOne({ _id:requestedUser,mytodo:{$elemMatch:{userId:requestedPost}} },
        //    (err,data) => {
        //     if (!err) {
            
        //         console.log(data);
        //     }
        //     else {
        //         console.log(err);
        //     }
        // }
        // );

     

    }

    else {
        res.redirect("/signin#LoginSignup");
    }

});


// ----------------------------------P O S T-----------------------------------------

app.post("/signup", function (req, res,next) {
    const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        post: req.body.post,

    })




    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            // console.log(err);
            res.redirect("/signup?error=exist");
        }
        else {
            passport.authenticate("local", (err, user, info) => {
                if (err) throw err;
                if (!user){
                  const ack="NO USER FOUND";
                  res.render("signin",{ack});
                }
                else {
                  req.logIn(user, (err) => {
                    if (err) throw err;
                  if(user.post=='Mentor'){
                      res.redirect("/mentor");
                  }
                  else{
                      res.redirect("/user");
                  }
          
          
                  });
                }
              })(req, res, next);
        }
    })




});


app.post("/signin", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) throw err;
      if (!user){
        const ack="NO USER FOUND";
        res.render("signin",{ack});
      }
      else {
        req.logIn(user, (err) => {
          if (err) throw err;
        if(user.post==='Mentor'){
            res.redirect("/mentor");
        }
        else{
            res.redirect("/user");
        }


        });
      }
    })(req, res, next);

  });


app.post("/assignteam",(req,res)=>{

    if(req.isAuthenticated()){

        const todo = {
            text: String,
            status:Boolean,
            postId: String
        }
        const fromto = "/" + req.query.user;
        const postid = ObjectId();

        todo.text = req.body.todo;
        todo.status=false;
        todo.postId = postid;
    
        User.findOne({username:req.body.username}, function (err, foundUser) {
            if (err) {
                alert("user not found");
            }
            else {
                if (foundUser) {
                    foundUser.lastupdate = new Date;
                    foundUser.assignedtodo.push(todo);
                   
                    foundUser.save(function (err) {
                        if(!err){
                            res.redirect("/mentor");
                        }else{
                            res.send(err);
                        }
    
                    });
                }else{
                    res.send("user not found")

                }
            }
        });
    
    
    
    }

    else{

        const ack="Login first";
        res.render("signin",{ack});
    }

});


app.post("/assignself",(req,res)=>{


    if(req.isAuthenticated()){

        const todo = {
            text: String,
            status:Boolean,
            postId: String
        }
        const fromto = "/" + req.query.user;
        const postid = ObjectId();

        todo.text = req.body.todo;
        todo.status=false;
        todo.postId = postid;
    
        User.findById(req.session.passport.user, function (err, foundUser) {
            if (err) {
                res.send(err);
            }
            else {
                if (foundUser) {
                    foundUser.lastupdate = new Date;
                    foundUser.mytodo.push(todo);
                   
                    foundUser.save(function (err) {
                        if(!err){
                            res.redirect(fromto);
                        }else{
                            res.send(err);
                        }
    
                    });
                }
            }
        });
    
    
    
    }

    else{
        const ack="Login first";
        res.render("signin",{ack});
    }


});






app.listen("3000",()=>{
    console.log("server started at port : 3000")
})