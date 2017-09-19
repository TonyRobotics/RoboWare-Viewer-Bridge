/**
 * roboware_viewer_bridge
 * TonyRobotics
 * @author abner.zhang 2017-08-11
 */
var http = require("http");
var url = require("url");
var fs = require("fs");
var mosca = require('mosca');
var express = require('express');
var app = express();
 
///////////////////////////////////////////////////////////////////
// RESTful Server
///////////////////////////////////////////////////////////////////
app.get('/', function (req, res) {
   res.send('Hello World, Abner Zhang!');
})
app.get('/listUsers', function (req, res) {
   console.log(__dirname);
   fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
       console.log( data );
       res.end( data );
   });
})
var restfulPort = "8080";
var server = app.listen(restfulPort);
require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
 	console.log('RESTful Server Running At http://' + addr  + ((restfulPort === 80) ? '' : ':') + restfulPort + '/');
});

///////////////////////////////////////////////////////////////////
// Static Server
///////////////////////////////////////////////////////////////////
var server = http.createServer(function(req, res){
    var req_path = url.parse(req.url).path;
    var filepath = __dirname + "/apps" + req_path;
    //console.log(filepath);
    fs.exists(filepath, function(exists){
        if(exists){
            fs.stat(filepath, function(err, stats){
                if(err){
                    res.writeHead(500, {'Content-Type' : 'text/html;charset=utf8'});
                    res.end('<div styel="color:black;font-size:22px;">server error</div>');
                }else{
                    if(stats.isFile()){
                        var file = fs.createReadStream(filepath);
                        res.writeHead(200, {'Content-Type' : 'text/html;charset=utf8'});
                        file.pipe(res);
                    }else{
                        fs.readdir(filepath, function(err, files){
                            var str = '';
                            for(var i in files){
                                str += files[i] + '<br/>';
                            }
                            res.writeHead(200, {'Content-Type' : 'text/html;charset=utf8'});
                            res.write(str);
                        });
                    }
                }
            });
        }else{
            res.writeHead(404, {'Content-Type' : 'text/html;charset=utf8'});
            res.end('<div styel="color:black;font-size:22px;">404 not found</div>');
        }
    });
});
var port = "9091";
server.listen(port);
require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
 	console.log('Static Server Running At http://' + addr  + ((port === 80) ? '' : ':') + port + '/');
});

///////////////////////////////////////////////////////////////////
// MQTT Broker
///////////////////////////////////////////////////////////////////
var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
};
var settings = {
  port: 1883,
  backend: ascoltatore,
  http: {//支持 websocket
    port: 1884,
    bundle: true,
    static: './'
  }
};
var server = new mosca.Server(settings);
server.on('clientConnected', function(client) {
    console.log('client connected', client.id);
});
// fired when a message is received
server.on('published', function(packet, client) {
    console.log('Published', packet.payload);
});
server.on('ready', setup);
// fired when the mqtt server is ready
function setup() {
    require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
        console.log('MQTT Server Running At mqtt://' + addr  + ((settings.port === 80) ? '' : ':') + settings.port + '/ And http://' + addr  + ((settings.port === 80) ? '' : ':') + settings.http.port + '/');
    });
}

///////////////////////////////////////////////////////////////////
// ROS Node:/roboware_viewer_bridge
// viewer:ros_handle、ros_map_2d、ros_map_3d、ros_nav_2d、ros_angular_vel、ros_liner_vel
///////////////////////////////////////////////////////////////////
const rosnodejs = require('rosnodejs');
let mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://127.0.1.1:1883/')
//连接到mqtt server
client.on('connect', function () {
    console.log("MQTT Client Connect. ");
})
rosnodejs.initNode('/roboware_viewer_bridge', {onTheFly: true}).then((rosNode) => {
  
  /*
   * [ROS]订阅线速度、角速度数据
   * topic:/odom
   * message:nav_msgs/Odometry
   */
  const nh = rosnodejs.nh;

  nh.subscribe('/odom', 'nav_msgs/Odometry', (msg) => {
    console.log('Got msg on map: %j', msg);
    client.publish('/odom',JSON.stringify(msg))
  });

  //订阅[MQTT]Topic
  client.subscribe("/cmd_vel")
  //接收[MQTT]订阅消息
  client.on("message", function (topic, payload) {
      console.log(topic);  
      let cmd_vel = rosNode.advertise('/cmd_vel','geometry_msgs/Twist', {
          queueSize: 1,
          latching: true,
          throttleMs: 9
      });
      const Twist = rosnodejs.require('geometry_msgs').msg.Twist;
      const msgTwist1 = JSON.parse(payload);
      console.log(msgTwist1);
      //发布[ROS]消息
      cmd_vel.publish(msgTwist1);
      //client.end()
  })

  //小乌龟
  //订阅[MQTT]Topic
  client.subscribe("/turtle1/cmd_vel")
  //接收[MQTT]订阅消息
  client.on("message", function (topic, payload) {
      console.log(topic);  
      let cmd_vel = rosNode.advertise('/turtle1/cmd_vel','geometry_msgs/Twist', {
          queueSize: 1,
          latching: true,
          throttleMs: 9
      });
      const Twist = rosnodejs.require('geometry_msgs').msg.Twist;
      const msgTwist1 = JSON.parse(payload);
      console.log(msgTwist1);
      //发布[ROS]消息
      cmd_vel.publish(msgTwist1);
      //client.end()
  })  
 
  if(window.WebSocket){
      console.log('This browser supports WebSocket');
  }else{
      console.log('This browser does not supports WebSocket');
  }
  
});

