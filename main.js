var express     =require('express'),
    app         =new express(),
    path        =require('path'),
    mongooose   =require('mongoose'),
    passport    =require('passport'),
    bodyParser  =require('body-parser'),
    LocalStrategy=require('passport-local'),
    fs=require('fs'),
    multer=require('multer'),
    passportLocalMongoose=require('passport-local-mongoose'),
    friendsPlugin=require('mongoose-friends-plugin'),
    timestamps=require('mongoose-timestamp');



//---------------
// Mongooose
//---------------


var mongoose=require('mongoose');
mongoose.Promise=global.Promise;
// var url='mongodb://localhost/socialsounds';
var url='mongodb+srv://hipsi:hipsirakshinikki@socialsoundsbyhipsi-wdow5.mongodb.net/social?retryWrites=true&w=majority';
mongoose.connect(url,{  useNewUrlParser: true });
var db=mongoose.connection;
db.on('error',console.error.bind(console,'MongoDb connection error'));
mongoose.set('useCreateIndex',true);


//---------------
// All schemas
//---------------

var comment=new mongoose.Schema({
    text:String,
    likes:Number,
    author:{
        id:{type:mongoose.Schema.Types.ObjectId,
            ref:"User"},
        username:String
    }
});

var UserSchema=new mongoose.Schema({
    firstName: String,
    surName:String,
    username:String,
    password:String,
    profilephoto:String,
    coverphoto:String,
    birthdate:String,
    friends:[String],
    requests:[String],
    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post"
    }],
    aposts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Apost"
    }],
    hometown:String,
    currenttown:String,
    state:String,
    about:String
});


var post=new mongoose.Schema({
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"},
        username:String,
        profilephoto:String
    },
    image:String,
    caption:String,
    likes:Number,
    likesby:[{
        id:{type:mongoose.Schema.Types.ObjectId,
            ref:"UserSchema"},
        username:String
    }],
    comments:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
});

var ananomouspostschema=new mongoose.Schema({
    image:String,
    caption:String,
    likes:Number,
    likesby:[{
        id:{type:mongoose.Schema.Types.ObjectId,
            ref:"UserSchema"},
        username:String
    }],
    comments:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(friendsPlugin());
UserSchema.plugin(timestamps);
post.plugin(timestamps);
ananomouspostschema.plugin(timestamps);
comment.plugin(timestamps);
var User=mongoose.model('User',UserSchema);
var Comment=mongoose.model('Comment',comment);
var Post=mongoose.model('Post',post);
var Apost=mongoose.model('Apost',ananomouspostschema);




//-----------------
//all uses
//-----------------

app.set('view engine','ejs');
app.use(express.static(path.join(__dirname,'/')));
app.use(bodyParser.urlencoded({extended:true}));
app.use(require("cookie-session")({
    secret:"hipsipass",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.currentUser=req.user;
    next();
});
app.use(bodyParser.json());
app.use('uploads',express.static('uploads'));
var storage=multer.diskStorage({
    fileFilter: function(req,file,cb){
        if(!file.mimetype.match(/jpg|jpeg|png|gif$i/)){
            cb(new Error('File is not supported'),false)
            return
        }
        cb(null,true);
    }
})
var upload=multer({storage:storage});
const cloudinary=require('cloudinary');
cloudinary.config({
    cloud_name:'hipsicloud',
    api_key:'132221192517858',
    api_secret:'sTC558B7RVN40sFYbVN_26GMWLA'  
});





//-------------------
// Routing
//-------------------

app.get('/',isLoggedIn,(req,res)=>{
    res.redirect('/home');
})


app.get('/home',isLoggedIn,(req,res)=>{
    User.findById(req.user._id,(err,user)=>{
        Post.find().populate('comments').sort({createdAt:-1}).exec((err,posts)=>{
            user.getFriends().then((friends)=>{
                Apost.find().populate('comments').sort({createdAt:-1}).exec((err,aposts)=>{
                    res.render('main',{friends:friends,user:user,posts:posts,aposts:aposts});
                });
            });
        });
    });
});



app.get('/login',(req,res)=>{
    res.render('login');
});

app.post('/login',passport.authenticate("local",{
    successRedirect:"/home",
    failureRedirect:"login"
}),(req,res)=>{
      
});

app.get('/logout',(req,res)=>{
	req.logout();
	res.redirect("/login");
});

app.post('/signup',(req,res)=>{
    if(req.body.password!=req.body.password2){
        res.send("Wrong password");
        res.redirect('back');
    }
    else{
    var newuser={profilephoto:"https://res.cloudinary.com/hipsicloud/image/upload/v1589544159/1024px-No_image_available.svg_rp2tf0.webp",coverphoto:"https://res.cloudinary.com/hipsicloud/image/upload/v1589280069/cover_nhj8t6.png",firstName:req.body.firstname,surName:req.body.surname,username:req.body.username};
    User.register(newuser,req.body.password,(err,newlycreated)=>{
        if(err){
            console.log(err);
            return res.render('login');
        }
        else {
            passport.authenticate("local")(req,res,()=>{
            // res.render('main',{user:newlycreated});
            Post.find().populate('comments').sort({updatedAt:-1}).exec((err,posts)=>{
                newlycreated.getFriends().then((friends)=>{
                    Apost.find().populate('comments').sort({updatedAt:-1}).exec((err,aposts)=>{
                        res.render('main',{friends:friends,user:newlycreated,posts:posts,aposts:aposts});
                    });
                });
            });        
        });
        }
    });    
    }
});





//----------------------------
//friends
//----------------------------

app.get('/friends',isLoggedIn,(req,res)=>{
    User.findById(req.user._id).populate('friends').exec((err,user)=>{
        user.getFriends().then((friends)=>{
            res.render('friends',{user:user,friends:friends});
        })
    })
})

app.get('/requests',isLoggedIn,(req,res)=>{
    User.findById(req.user._id).populate('friends').exec((err,user)=>{
        user.getFriends().then((friends)=>{
            res.render('requests',{user:user,friends:friends});
        })
    })  
})





//---------------------
//profile
//---------------------

app.get('/profile',isLoggedIn,(req,res)=>{
    var username=req.user.username;
    User.findOne({username:username}).populate("posts").populate({path:'posts',populate:{path:'comments'}}).exec((err,user)=>{
        user.getFriends().then((friends)=>{
            res.render('profile',{user:user,friends:friends});
        }); 
    });
});

app.get('/:friendname/profile',isLoggedIn,(req,res)=>{
    var friendname=req.params.friendname;
    User.findOne({username:req.user.username}).populate("posts").populate({path:'posts',populate:{path:'comments'}}).exec((err,user)=>{
        if(err){
            console.log(err);
        }
        else{
            
            User.findOne({username:friendname}).populate("posts").populate({path:'posts',populate:{path:'comments'}}).exec((req,frienduser)=>{
                user.getFriends().then((friends)=>{
                    var st=0;
                    friends.forEach(friend=>{
                        if((friend.friend.username===friendname)&&friend.status==="accepted"){
                            st=1;
                        }
                    })
                    if(st===0){
                        res.redirect('back');
                    }
                    else{
                            frienduser.getFriends().then((friendfriends)=>{
                            res.render('friendprofile',{user:user,userfriends:friends,friendfriends:friendfriends,frienduser:frienduser});
                        })
                    }                    
                })
            })
        }

    })
})


app.post('/profile/uploadprofilephoto',upload.single('image'),async(req,res)=>{
    var username=req.user.username;
    var image=await cloudinary.v2.uploader.upload(req.file.path);
    User.findOneAndUpdate({username:username},{profilephoto:image['secure_url']},{new:true},(err,user)=>{
        if(err){console.log(err);}
        else{
            Post.find({'author.username':username},(err,posts)=>{
                if(err){
                    console.log(err);
                }
                else{
                    posts.forEach(post=>{
                        post.author.profilephoto=image['secure_url'];
                        post.save();
                    })
                    res.redirect('/profile');
                }
            });
        }
    });
});

app.post('/profile/uploadcoverphoto',upload.single('image'),async(req,res)=>{
    var username=req.user.username;
    var image=await cloudinary.v2.uploader.upload(req.file.path);
    User.findOneAndUpdate({username:username},{coverphoto:image['secure_url']},{new:true},(err,user)=>{
        if(err){console.log(err);}
        else{
            res.redirect('/profile');
        }
    });
});

app.post('/profile/uploadinfo',(req,res)=>{
    var username=req.user.username;
    var user={birthdate:req.body.birthdate,
        currenttown:req.body.currentcity,
        hometown:req.body.hometown,
        state:req.body.state,
        about:req.body.about
    }
    console.log(user);
    User.findOneAndUpdate({username:username},user,{new: true},(err,user)=>{
        if(err){console.log(err);}
        else{
            res.redirect('/profile');
        }
    });
});








//-------------------------
//search
//--------------------------
app.get('/search',isLoggedIn,(req,res)=>{
    res.redirect('/home');
})
app.post('/search',isLoggedIn,(req,res)=>{
    var search=req.body.searchname;
    User.find({$or:[{firstName:{"$regex":search,"$options":"i"}},{surName:{"$regex":search,"$options":"i"}},{username:{"$regex":search,"$options":"i"}}]},(err,users)=>{
        if(err){
            console.log(err);
            res.redirect('back');
        }
        else{
            User.findOne({username:req.user.username},(err,curuser)=>{
            if(err){
                console.log(err);
            }    
            else{
                User.getFriends(curuser).then((friendstatus)=>{
                res.render('search',{user:curuser,data:users,friendstatus:friendstatus,search:search});                    
                });

            }
        });  
        }
    });
});






//--------------------------
//ananomous
//--------------------------

app.get('/ananomous',isLoggedIn,(req,res)=>{
    User.findById(req.user._id).populate('aposts').populate({path:'aposts',populate:{path:'comments'}}).exec((err,user)=>{
        Apost.find().populate('comments').sort({updatedAt:-1}).exec((err,aposts)=>{
            user.getFriends().then((friends)=>{  
                res.render('ananomous',{friends:friends,user:user,posts:aposts});
            })
        })
    })
})

app.post('/ananomous/:postid/comment/:comment',isLoggedIn,(req,res)=>{
    var postId=req.params.postid;
    var username=req.user.username;
    var comment=req.params.comment;
    var userId=req.user._id;
    Apost.findById(postId,(err,post)=>{
        if(err){
            console.log(err);
        }
        else{
            var newcomment={text:comment,likes:0};
            Comment.create(newcomment,(err,comm)=>{
                comm.author.id=userId;
                comm.author.username=username;
                comm.save();
                post.comments.push(comm._id);
                post.save();
                var commentcount=post.comments.length;
                res.send({comm:comm,commentcount:commentcount});
            })
        }
    })
})

app.post('/ananomous/:postid/like/:s',isLoggedIn,(req,res)=>{
    Apost.findById(req.params.postid,(err,post)=>{
        if(err){
            console.log(err);
        }
        else{
            if(req.params.s==="false"){
                post.likes+=1;
                User.findOne({username:req.user.username},(err,user)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        post.likesby.push({id:user._id,username:user.username});
                        post.save();
                        res.send({likecount:post.likes});
                    }
                })
            }
            else{
                post.likes-=1;
                User.findOne({username:req.user.username},(err,user)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        var index=post.likesby.indexOf({id:user._id,username:user.username});
                        post.likesby.splice(index,1);
                        post.save();
                        res.send({likecount:post.likes});
                    }
                })
            }
        }
    })
})


app.post('/ananomous/newpost',isLoggedIn,upload.single('postimage'),async(req,res)=>{
    var image
    if(req.file){
        image=await cloudinary.v2.uploader.upload(req.file.path);
    }else{
        image="";
    }
    var img="";
    if(image!=="")
        img=image['secure_url'];
    var newpost={
        image:img,
        caption:req.body.posttext
    };
    Apost.create(newpost,(err,post)=>{
        if(err){
            console.log(err);
        }else{
            User.findById(req.user._id,(err,user)=>{
                post.likes=0;
                post.save();
                user.aposts.push(post);
                user.save();
                res.redirect('back');
            })
        }        
    })
});

app.post('/ananomous/:postid/delete',isLoggedIn,(req,res)=>{
    User.findOne({username:req.user.username},(err,user)=>{
        if(err){
            console.log(err);
        }
        else{
            var index=user.aposts.indexOf(req.params.postid);
            user.aposts.splice(index,1);
            user.save();
        }
    })
    Apost.findByIdAndDelete(req.params.postid,(err)=>{
        if(err){
            res.send("err");
        }
        else{
            res.send("ok");
        }
    })
})

app.post('/ananomous/:postid/comment/:commentid/remove',(req,res)=>{
    var commentcount;
    Apost.findById(req.params.postid,(err,post)=>{
        var index=post.comments.indexOf(req.params.commentid);
        post.comments.splice(index,1);
        post.save();
        commentcount=post.comments.length;
    })
    Comment.findByIdAndDelete(req.params.commentid,(err)=>{
        if(err){
            res.send("err");
        }
        else{
            res.send({commentcount:commentcount});
        }
    })
})

app.post('/ananomous/:postid/edit/:newcomment',(req,res)=>{
    Apost.findOneAndUpdate({_id:req.params.postid},{caption:req.params.newcomment},{new:true},(err,post)=>{
        if(err){
            console.log(err);
        }       
        else{
            res.send(post.caption);
        }
    })
})

app.post('/ananomous/:postid/likesby',isLoggedIn,(req,res)=>{
    var postid=req.params.postid;
    var username=req.user.username;
    User.findOne({username:username},(err,user)=>{
        if(err){
            res.send(err);
        }
        else{
            Apost.findById(postid,(err,post)=>{
                user.getFriends().then((friends)=>{
                    res.send({likesby:post.likesby,friends:friends,username:username})
                })
            })
        }
    })
})





//-------------------------
//friend
//-------------------------

app.post('/addfriend',(req,res)=>{
    var search=req.body.searchname;
    User.findOne({username:req.user.username},(err,curuser)=>{
        if(err){
            console.log(err);
        }else{
        User.findOne({username:req.body.sendto},(err,sendtouser)=>{
            if(err){
                console.log(err);
            }else{
                curuser.requestFriend(sendtouser).then(()=>{
                    User.find({firstName:search},(err,users)=>{
                        if(err){
                            console.log(err);
                            res.render('back');
                        }
                        else{
                            User.findOne({username:req.user.username},(err,curuser)=>{
                                if(err){
                                    console.log(err);
                                }    
                                else{
                                    User.getFriends(curuser).then((friendstatus)=>{
                                        // res.render('search',{user:curuser,data:users,friendstatus:friendstatus,search:search});                    
                                        res.redirect('friends');
                                    });

                                }
                            });     
                        }
                    });                    
                })
            }
        });
        }
    });
});
app.post('/removefriend',(req,res)=>{
    var search=req.body.searchname;
    User.findOne({username:req.user.username},(err,curuser)=>{
        if(err){
            console.log(err);
        }else{
        User.findOne({username:req.body.sendto},(err,sendtouser)=>{
            if(err){
                console.log(err);
            }else{
                curuser.removeFriend(sendtouser).then(()=>{
                    User.find({firstName:search},(err,users)=>{
                        if(err){
                            console.log(err);
                            res.render('back');
                        }
                        else{
                            User.findOne({username:req.user.username},(err,curuser)=>{
                                if(err){
                                    console.log(err);
                                }    
                                else{
                                    User.getFriends(curuser).then((friendstatus)=>{
                                        // res.render('search',{user:curuser,data:users,friendstatus:friendstatus,search:search});                    
                                        res.redirect('friends');
                                    });

                                }
                            });  
                        }
                    });  
                })
            }
        });
        }
    });
})

app.post('/requestsaccept',(req,res)=>{
    User.findOne({username:req.user.username},(err,curuser)=>{
        if(err){
            console.log(err);
        }else{
            User.findOne({username:req.body.sendto},(err,sendtouser)=>{
                if(err){
                    console.log(err);
                }else{
                    curuser.requestFriend(sendtouser).then(()=>{
                        User.findById(req.user._id).populate('friends').exec((err,user)=>{
                            user.getFriends().then((friends)=>{
                                res.render('requests',{user:user,friends:friends});
                            })
                        })         
                    });
                }
            });
        }
    });
});

app.post('/friendsremove',(req,res)=>{
    User.findOne({username:req.user.username},(err,curuser)=>{
        if(err){
            console.log(err);
        }else{
        User.findOne({username:req.body.sendto},(err,sendtouser)=>{
            if(err){
                console.log(err);
            }else{
                curuser.removeFriend(sendtouser).then(()=>{
                    User.findById(req.user._id).populate('friends').exec((err,user)=>{
                        user.getFriends().then((friends)=>{
                            res.render('friends',{user:user,friends:friends});
                        })
                    })                
                })
            }
        });
        }
    });

})
app.post('/:username/remove',(req,res)=>{
    var username=req.params.username;
    User.findOne({username:req.user.username},(err,user)=>{
        if(err){
            console.log(err);
        }
        else{
            User.findOne({username:username},(err,frienduser)=>{
                if(err){
                    console.log(err);
                }
                else{
                    user.removeFriend(frienduser).then(()=>{
                        res.redirect('/profile');
                    })
                }
            })
        }
    })
})












//---------------------------
//post function
//---------------------------

app.post('/newpost',isLoggedIn,upload.single('postimage'),async(req,res)=>{
    var image;
    if(req.file){ 
    image=await cloudinary.v2.uploader.upload(req.file.path);
    }
    else{
        image="";
    }
    User.findById(req.user._id,(err,user)=>{
        if(err){
            console.log(err);
            res.redirect('/');
        }
        else{
            var img="";
            if(image!=="")
                img=image['secure_url'];
            var newpost={
                image:img,
                caption:req.body.posttext
            };
            Post.create(newpost,(err,post)=>{
                if(err){
                    console.log(err);
                }else{
                post.author.id=req.user._id;
                post.author.username=user.username;
                post.author.profilephoto=user.profilephoto;
                post.likes=0;
                post.save();
                user.posts.push(post);
                user.save();
                res.redirect('back');
                }        
            })
        }
    });
});



app.post('/:postid/comment/:comment',isLoggedIn,(req,res)=>{
    var postId=req.params.postid;
    var username=req.user.username;
    var comment=req.params.comment;
    var userId=req.user._id;
    Post.findById(postId,(err,post)=>{
        if(err){
            console.log(err);
        }
        else{
            var newcomment={text:comment,likes:0};
            Comment.create(newcomment,(err,comm)=>{
                comm.author.id=userId;
                comm.author.username=username;
                comm.save();
                post.comments.push(comm._id);
                post.save();
                var commentcount=post.comments.length;
                res.send({comm:comm,commentcount:commentcount});
            })
        }
    })
})


app.post('/:postid/like/:s',isLoggedIn,(req,res)=>{
    Post.findById(req.params.postid,(err,post)=>{
        if(err){
            console.log(err);
        }
        else{
            if(req.params.s==="false"){
                post.likes+=1;
                User.findOne({username:req.user.username},(err,user)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        post.likesby.push({id:user._id,username:user.username});
                        post.save();
                        res.send({likecount:post.likes});
                    }
                })
            }
            else{
                post.likes-=1;
                User.findOne({username:req.user.username},(err,user)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        var index=post.likesby.indexOf({id:user._id,username:user.username});
                        post.likesby.splice(index,1);
                        post.save();
                        res.send({likecount:post.likes});
                    }
                })
            }
        }
    })
})


app.post('/:postid/delete',isLoggedIn,(req,res)=>{
    User.findOne({username:req.user.username},(err,user)=>{
        if(err){
            console.log(err);
        }
        else{
            var index=user.posts.indexOf(req.params.postid);
            user.posts.splice(index,1);
            user.save();
        }
    })
    Post.findByIdAndDelete(req.params.postid,(err)=>{
        if(err){
            res.send("err");
        }
        else{
            res.send("ok");
        }
    })
})

app.post('/profile/:postid/edit/:newcaption',(req,res)=>{
    Post.findOneAndUpdate({_id:req.params.postid},{caption:req.params.newcaption},{new:true},(err,post)=>{
        if(err){
            console.log(err);
        }       
        else{
            res.send({caption:post.caption});
        }
    })
})




app.post('/:postid/comment/:commentid/remove',(req,res)=>{
    var commentcount,precommentcount;
    Post.findById(req.params.postid,(err,post)=>{
        if(err){
            console.log(err);
        }
        else{
            precommentcount=post.comments.length;
            var index=post.comments.indexOf(req.params.commentid);
            post.comments.splice(index,1);
            post.save();
            commentcount=post.comments.length;
            Comment.findByIdAndDelete(req.params.commentid,(err)=>{
                if(err){
                    res.send("err");
                }
                else{
                    res.send({commentcount:commentcount,precommentcount:precommentcount});
                }
            })
        }
    })
    
})

app.post('/:postid/likesby',isLoggedIn,(req,res)=>{
    var postid=req.params.postid;
    var username=req.user.username;
    User.findOne({username:username},(err,user)=>{
        if(err){
            res.send(err);
        }
        else{
            Post.findById(postid,(err,post)=>{
                user.getFriends().then((friends)=>{
                    res.send({likesby:post.likesby,friends:friends,username:username})
                })
            })
        }
    })
})



//----------------------------
//functions
//----------------------------

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}



app.listen(process.env.PORT||3000,()=>{
    console.log('Server running');
});
