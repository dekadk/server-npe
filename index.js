"use strict";
require('dotenv').config();
// const {workbook} =  require("./initxsls")
// const {app,fs,io} =  require("./init")
var delay = 0;
var user = 0;
var express = require('express');
var app = express();
const expresslayouts = require('express-ejs-layouts')
const cors = require('cors');
app.set('view engine','ejs');
app.use(expresslayouts);
app.use(express.static('public'));
app.use(express.urlencoded({extended:true}));
var fs = require('fs');

const bodyParser = require("body-parser");
app.use(bodyParser.text({ type: "text/plain" })); 

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server,{
  cors:{
    // origin:"http://...:3000",
    methods:["GET","POST"],
  }
});

app.use(cors({
  // origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  // allowedHeaders: ['Content-Type', 'Authorization']
}));


const {runQueryAsync,parseData} =  require("./initsql");
const { deflate } = require('zlib');



io.on('connection', (socket) => {
   
   user+=1;
   console.log(user+' user connected '+socket.id);
  //  getDataOut();
  socket.on('exec',function(query){
    odbc.connect(connectionString,(errconn,connection)=>{
      connection.query(query,(errquery,res)=>{
        
        socket.emit('result',{val:res,col:res.columns,statement:res.statement});
      })
    })
  });
  socket.on('insert',function(query){
    odbc.connect(connectionString,(errconn,connection)=>{
      connection.query(query.insert,(errquery,res)=>{
        connection.query(query.select,(errquery,res)=>{        
          socket.emit('result',{val:res,col:res.columns,statement:res.statement});
        })
      })
    })
  });
  socket.on('disconnect', function () {
    user-=1;
    console.log(user+' user connected');
 });
});
app.get('/test',(req,res)=>{  
  res.send("TEST SERVER NODE DONE")
})
app.get('/conn1',(req,res)=>{
  io.emit("receive_message",{message:"COBA"});
  res.send("Refresh Done REACT")
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
})
app.get('/execmysql/:command',(req,res)=>{
  console.log(req.params.command);
  runMySQLQuery(req.params.command,res);
})
app.get('/exec/:command',(req,res)=>{
  console.log(req.params.command);
  getData(req.params.command,res);
})
app.get('/insert/:insert/:select',(req,res)=>{
  console.log(req.params.insert);
  getDataInsert(req.params.insert,req.params.select,res);

})
app.get('/Stock1', (req, res) => {
    res.render('main' ,{layout:'main', title:'DATA STOCK 1012',page:'1'});
})
async function getData(query,res){
  
  try {
    const result=await runQueryAsync(query)
    res.send(result)
  } catch (error) {
	console.log(error)
    res.send(error)
  }
  
}
async function getDataInsert(query,select,res){
  
  try {
    await runQueryAsync(query)
    const result=await runQueryAsync(select)
    res.send(result)
  } catch (error) {
	console.log(error)
    res.send(error)
  }
  
}

async function getDataOut(){
  if (delay==0){
    delay=1;
    try {
      // result=await runQueryAsync("select m.Number 'Kode Material',substring(m.Deskripsi,0,30) 'Nama Part','' Min,'' Max,sum(((case IFNULL(ScanDate,0) when 0 then 0 else 1 end) - (case IFNULL( DeliveryID,0) when 0 then 0 else 1 end))*actualqty) Act from qrdata p left join material m on p.materialid=m.materialid where scandate is not null group by m.Number,m.Deskripsi order by m.Number,m.Deskripsi")
      result=await runQueryAsync("select sum(sum(ActualQty))over(partition by true)Cumulative,sum(min(Target)*hour(max(ScanDate)))over(partition by true)TargetCumulative, min(m.deskripsi)Nama,cast(sum(ActualQty) as char)Actual,cast(min(Target)*hour(max(ScanDate)) as char) Planned from qrdata p left join material m on p.materialid=m.materialid where scandate>=DATE_FORMAT(NOW(), '%Y/%m/%d') and target>0 group by p.materialid order by sum(ActualQty)/(min(Target)*hour(max(ScanDate)))")
      var out;
      
      out={result,tipe:'Stok'};    
      // console.log("Stok Out");
      io.emit("refreshworst",out);
      result=await runQueryAsync("select min(m.deskripsi)Nama,cast(sum(ActualQty) as char)Actual,cast(min(Target)*hour(max(ScanDate)) as char) Planned from qrdata p left join material m on p.materialid=m.materialid where scandate>=DATE_FORMAT(NOW(), '%Y/%m/%d') and target>0 and urgent>0 group by p.materialid order by sum(ActualQty)/(min(Target)*hour(max(ScanDate)))")
      var out;
      out={result,tipe:'Scan'};    
      // console.log("Scan Out");
      io.emit("refreshurgent",out);
    } catch (error) {
      console.log(error)    
    }
    delay=0;
  }
  
  
}


app.get('/conn',(req,res)=>{
  var ref
  getDataOut();
  
  
  res.send("Refresh Done")
})
app.post('/getstok',(req,res)=>{
  // var filter=JSON.parse(req.body);
 // getData("select m.Number [Kode Material],substring(m.Deskripsi,0,30) [Nama Part],'' Min,'' Max,sum(case ISNULL(ScanDate,0) when 0 then 0 else 1 end) - sum(case ISNULL( DeliveryID,0) when 0 then 0 else 1 end) Act from qrdata p left join material m on p.materialid=m.materialid where scandate is not null group by m.Number,m.Deskripsi order by m.Number,m.Deskripsi",res)
  
})

app.post('/getscan',(req,res)=>{
  // var filter=JSON.parse(req.body);

  //getData("select m.Number [Kode Material],substring(m.Deskripsi,0,30) [Nama Part],sum(case ISNULL(ScanDate,0) when 0 then 0 else 1 end) Qty,'' Target,'' Achv from qrdata p left join material m on p.materialid=m.materialid where month(scandate) =month(getdate()) group by m.Number,m.Deskripsi order by m.Number,m.Deskripsi",res)
  
})

app.post('/getdetail',(req,res)=>{
 
  var filter=JSON.parse(req.body);
  // console.log("select * from DataWeigherID where DataDateAndTime>='"+filter.dari+"' and DataDateAndTime<dateadd(day,1,'"+filter.hingga+"')")
  getData("select DataDateAndTime,Barcode,convert(decimal(10,2),Weight,0)Weight,convert(decimal(10,2),MinWeight,0)MinWeight from DataWeigherID where convert(date,datadateandtime,0)='"+filter.Tanggal+"' and StatusSorting='"+filter.StatusSorting+"' order by DataDateAndTime",res)
})

app.post('/getdetail2',(req,res)=>{
 
  var filter=JSON.parse(req.body);
  // console.log("select * from DataWeigherID where DataDateAndTime>='"+filter.dari+"' and DataDateAndTime<dateadd(day,1,'"+filter.hingga+"')")
  getData("select DataDateAndTime,Barcode,convert(decimal(10,2),Weight,0)Weight,convert(decimal(10,2),MinWeight,0)MinWeight from DataWeigherID_WithShift where tanggal='"+filter.Tanggal+"' and StatusSorting='"+filter.StatusSorting+"' and shift='"+filter.Shift+"' order by DataDateAndTime",res)
})

let port = process.env.PORT;
server.listen(port, function () {
  console.log('Listening on port ' + port);
});

