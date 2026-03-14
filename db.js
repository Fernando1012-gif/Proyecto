const mysql = require("mysql2");

const connection = mysql.createConnection({

host: "localhost",
user: "root",
password: "",
database: "sistema_permisos_salidas"

});

connection.connect((err)=>{

if(err){
console.log("Error de conexión:", err);
}else{
console.log("Conectado a la base de datos MySQL");
}

});

module.exports = connection;