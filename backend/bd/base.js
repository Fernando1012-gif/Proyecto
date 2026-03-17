const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',     
    database: 'sistema_permisos_salidas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


console.log('db lista :v');

module.exports = pool;