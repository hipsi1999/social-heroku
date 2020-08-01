var mongoose=require('mongoose');
var url='mongodb://localhost:27017/';
mongoose.connect(url,{useUnifiedTopology:true, useNewUrlParser:true});
var db=mongoose.connection;
db.on('error',console.error.bind(console,'MongoFB connection error'));


var schema=mongoose.Schema;
var post=new schema({
    caption:[String],
    like:[Number],
    comments:[String],
    
});
var person=new schema({
    name:String,
    email:String,
    phone:Number,
    password:Number,
    id:{
        type: mongoose.Schema.Types.ObjectId,
        index:true
    },
    friends:[Number],
    Notifications:[String],
    bdate:String,
    posts:[post]
});