const fs = require('fs');
const path = require('path');

const orderNumbersPath = path.join(__dirname, 'orderNumber.json');

// Ensure orderNumber.json exists
if (!fs.existsSync(orderNumbersPath)) {
    fs.writeFileSync(orderNumbersPath, JSON.stringify([]));
}

// Function to check if an order number is unique
function isOrderNumberUnique(orderNumber) {
    const orderNumbers = JSON.parse(fs.readFileSync(orderNumbersPath, 'utf8'));
    return !orderNumbers.includes(orderNumber);
}

// Function to add an order number to orderNumber.json
function addOrderNumber(orderNumber) {
    const orderNumbers = JSON.parse(fs.readFileSync(orderNumbersPath, 'utf8'));
    orderNumbers.push(orderNumber);
    fs.writeFileSync(orderNumbersPath, JSON.stringify(orderNumbers, null, 2));
}

module.exports = { isOrderNumberUnique, addOrderNumber };