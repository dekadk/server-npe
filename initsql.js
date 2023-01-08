require('dotenv').config();


const mysql = require('mysql');

var config = {
  user: process.env.DSN_UID,
  password: process.env.DSN_PWD,
  host: process.env.SERVER, 
  database: process.env.DSN_DB
};



const runQueryAsync = (str) =>{
  console.log(str);
  return new Promise((resolve,reject)=> {
    var conn = mysql.createConnection(config)
    conn.connect((err)=>{
      if(err){
        reject(err)
      }else{
        conn.query(str, function (error, results, fields) {
          conn.end();
          if (error) {
            reject(error)
          }else{
            const datout = {val:results,col:fields};
            resolve(datout);
          };        
          });
      }
    });
  })
  
  

 
  
}



function parseData(data){
  return JSON.parse(JSON.stringify(data, (key, value) =>
          typeof value === 'bigint'
              ? value.toString()
              : value // return everything else unchanged
      ));
}


module.exports = {runQueryAsync,parseData}