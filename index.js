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
const e = require('cors');



io.on('connection', (socket) => {
   
   user+=1;
  //  console.log(user+' user connected '+socket.id);
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
    // console.log(user+' user connected');
 });
});
app.get('/test',(req,res)=>{  
  res.send("TEST SERVER NODE DONE")
})
app.get('/conn1',(req,res)=>{
  io.emit("receive_message",{message:"COBA"});
  res.send("Refresh Done REACT")
})

function checkColumnHasID(name,table_col){
  var adaID=false;
  table_col.forEach(coldef => {
      if (name+"_id"===coldef.name){
          adaID=true;
      }})
  return adaID;
}
app.post("/delete",(req,res)=>{
  let data =JSON.parse(req.body)
  let table_col=data.table_col
  let tipe=data.tipe
  let inputOut=data.inputOut
  let selectquery=data.selectquery
  var updateVal='';
  var querycol='';
  table_col.forEach(col => {
      
      if (col.name===tipe+'_id'){
          if (inputOut[col.name]!=='' && inputOut[col.name]!==undefined){
              updateVal=' where '+col.name+'='+inputOut[col.name]
          }
      }
      
      
  })
  if (updateVal!==''){
      querycol='delete from '+tipe+' '+updateVal;
      getDataInsert(querycol,selectquery,res);   
  }else{
    res.send({"err":"Column "+tipe+"_id Not Found"})
  }
})
async function SaveDetail(data,res){
  let Table_detail=data.Table_detail
  let table_col=data.table_col
  let inputOut=data.inputOut
  let selectquery=data.selectquery
  let tipe=data.tipe
  var err=""
  var queryval="";
  var querycol="";
  if (Table_detail.val[0] && ("empty" in Table_detail.val[0])===false){
    try {
      await runQueryAsync("delete from "+tipe+"_detail where "+tipe+"_id="+inputOut[tipe+"_id"])
    } catch (error) {
      err+="Detail Row "+Table_detail.val.indexOf(detailVal)+":"+error.sqlMessage+"\r\n"
    }
    for (const detailVal of Table_detail.val ){
      var queryval=inputOut[tipe+"_id"];
      var querycol=tipe+"_id";
      for (const col of Table_detail.col){
        var adaID=checkColumnHasID(col.name,Table_detail.col);
  
        if (col.name!==tipe+'_id' && adaID===false){
            if (querycol!==''){
                querycol+=','
                queryval+=','
            }
            querycol+=col.name
            queryval+="'"+detailVal[col.name]+"'"
        }
      }
      
  
      querycol='insert into '+tipe+'_detail ('+querycol+') values ('+queryval+')';      
      try {
        await runQueryAsync(querycol)
      } catch (error) {
        console.log(error)
        err+="Detail Row "+Table_detail.val.indexOf(detailVal)+":"+error.sqlMessage+"\r\n"
        
      }
      
    }
    if (err!==""){
      res.send({error:err});
      return
    }
  }
  queryval="";
  querycol="";
  var updateVal="";
  table_col.forEach(col => {
    var adaID=checkColumnHasID(col.name,table_col);
    if (col.name===tipe+'_id'){
        if (inputOut[col.name]!=='' && inputOut[col.name]!==undefined){
            updateVal=' where '+col.name+'='+inputOut[col.name]
        }
    }
    if (updateVal!==''){
        if (col.name!==tipe+'_id' && adaID===false){
            if (querycol!==''){
                querycol+=","
            }

            querycol+=col.name+"='"+inputOut[col.name]+"'"
        }
    }else{
        if (col.name!==tipe+'_id' && adaID===false){
            if (querycol!==''){
                querycol+=','
                queryval+=','
            }
            querycol+=col.name
            queryval+="'"+inputOut[col.name]+"'"
        }
    }
    
    
  })
  if (updateVal!==''){
      querycol='update '+tipe+' set '+querycol+updateVal;
  }else{
      querycol='insert into '+tipe+' ('+querycol+') values ('+queryval+')';
  }
  getDataInsert(querycol,selectquery,res);
}
app.post("/update",(req,res)=>{
  let data =JSON.parse(req.body)
  SaveDetail(data,res)
  

})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
})

app.get('/exec/:command',(req,res)=>{
  // console.log(req.params.command);
  getData(req.params.command,res);
})

app.get('/Stock1', (req, res) => {
    res.render('main' ,{layout:'main', title:'DATA STOCK 1012',page:'1'});
})
async function getData(query,res){
  
  try {
    const result=await runQueryAsync(query)
    console.log(query)
    res.send(result)
    
  } catch (error) {
	
  res.send({error:error.toString()})
  }
  
}
async function getDataInsert(query,select,res){
  
  try {
    var err
    try {
      await runQueryAsync(query)
    } catch (error) {
      err=error.sqlMessage
      
    }
    
    const result=await runQueryAsync(select)
    result.error=err    
    res.send(result)
  } catch (error) {
	console.log(error)
    res.send({error:error.toString()})
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

var port = process.env.APP_PORT;
server.listen(port, function () {
  console.log('Listening on port ' + port);
});

