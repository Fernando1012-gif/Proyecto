//hasheador para db :v
const bcrypt = require('bcryptjs');
const generar = async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    console.log(hash);
};

generar();