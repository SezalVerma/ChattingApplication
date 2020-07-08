
var express=require('express');
var app= express();

// all api rendered would b referred through http
var server=require('http').Server(app);
var client= require('socket.io')(server).sockets;   // extract sockets that are connected
var path= require('path');
var ip= require("ip");

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

var mongo = require('mongodb').MongoClient;


// connect to mongo  &&& url from  package.json-config
mongo.connect( "mongodb://localhost:27017/chatdb", function(err, database){
    if(err) throw err;
    console.log('mongo connected');

    // extract db from database
     db = database.db('chatdb');

    // socket -- contains info about connected user
    // connect to client
    client.on('connection' , function(socket){
        console.log(" A new user is connected");
        
        // 'chats' collection created under chatdb
        let chat = db.collection('chats');

        // Create function to send status 
        SendStatus = function(s){
            socket.emit('status' , s);
        }

        // Get chats from mongo collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err,res){
            if(err) throw err;

            // Emit messages
            socket.emit('output' , res);
        })

        // Handle input event 
        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;

            //Check for name && message
            if(name==' ' || message==' '){
                // send error status
                SendStatus('Please enter name & message');
            }
            else{
                // insert messages
                chat.insert({name : name, message: message}, function(){
                    client.emit('output' , [data]);
                    // send status objects
                    SendStatus({
                        message : 'Msg sent',
                        clear   : true
                    })
                })
            }
        })

        //Handle clear chats
        socket.on('clear' , function(data){
            // remove all chats from collection 
            chat.remove({} , function(){
                socket.emit('cleared');
            })
        })

        socket.on('disconnect' , function(){
            console.log("A user is disconnected");
        })
    })
})

// var users= [];       // multiple users

// // socket -- contains info about connected user
// io.on('connection' , function(socket){ 
//     console.log("new connection created");
    
//     socket.on('disconnect' , function(){
//         console.log("User is disconnected");
//     })
// })

app.get('/' , function(req,res){
    res.sendFile(__dirname + '/index.html');
})

var port=8080;                                               // default
server.listen(port , function(){
    console.log("server listening at http://" + ip.address() + ":" + port );
})