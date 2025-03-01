const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'transactionID.json');

function getTransactionID() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({ id: 1 }));
    }
    const data = fs.readFileSync(filePath);
    const { id } = JSON.parse(data);
    return id;
}

function incrementTransactionID() {
    const id = getTransactionID();
    const newID = id + 1;
    fs.writeFileSync(filePath, JSON.stringify({ id: newID }));
}

module.exports = { getTransactionID, incrementTransactionID };