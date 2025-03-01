const axios = require('axios');
const readlineSync = require('readline-sync');
const fs = require('fs');
const path = require('path');
const constants = require('./constants');
const { getTransactionID, incrementTransactionID } = require('./transactionID');
const { isOrderNumberUnique, addOrderNumber } = require('./orderNumber');
require('dotenv').config();

// Function to get user input
function getInput(prompt) {
    return readlineSync.question(prompt);
}

// Function to get all user inputs
function getUserInput() {
    const orderNumber = getInput('Enter Order Number: ');
    const amount = getInput('Enter Amount: ');
    const cardNumber = getInput('Enter Card Number: ');
    const cardExpiryMonth = getInput('Enter Card Expiry Month (MM): ');
    const cardExpiryYear = getInput('Enter Card Expiry Year (YY): ');
    const cardCVV = getInput('Enter Card CVV: ');

    return { orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV };
}

// Function to validate user input values
function validateInput(orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV) {
    // Array to store error messages
    const errors = [];

    // Check if order number already exists in orderNumber.json
    if (!isOrderNumberUnique(orderNumber)) {
        errors.push('Order Number already exists. Please use a unique Order Number.');
    }

    // Check order number is unique 10 character alphanumeric value
    if (orderNumber.length !== constants.ORDER_NUMBER_LENGTH || !constants.ALLOWED_ALPHANUMERIC.test(orderNumber)) {
        errors.push(`Invalid Order Number. It should be ${constants.ORDER_NUMBER_LENGTH} alphanumeric characters.`);
    }

    // Check amount is a number with 2 decimal places or less and is not negative
    if (isNaN(amount)) {
        errors.push('Invalid Amount. It should be a number.');
    } else {
        const amountParts = amount.split('.');
        if (amountParts.length !== 2 || amountParts[1].length !== constants.AMOUNT_DECIMAL_PLACES) {
            errors.push(`Invalid Amount. It should be a number rounded to ${constants.AMOUNT_DECIMAL_PLACES} decimal places.`);
        }
    }

    // Check card number is a 16 digit numeric value
    if (cardNumber.length !== constants.CARD_NUMBER_LENGTH) {
        if (cardNumber.length > constants.CARD_NUMBER_LENGTH) {
            errors.push(`Invalid Card Number. It should be ${constants.CARD_NUMBER_LENGTH} numeric characters, but it has ${cardNumber.length} characters.`);
        } else {
            errors.push(`Invalid Card Number. It should be ${constants.CARD_NUMBER_LENGTH} numeric characters, but it has only ${cardNumber.length} characters.`);
        }
    } else if (!constants.ALLOWED_NUMERIC.test(cardNumber)) {
        errors.push(`Invalid Card Number. It should be ${constants.CARD_NUMBER_LENGTH} numeric characters.`);
    }

    // Check card expiry month is a 2 digit number between 01 and 12
    if (isNaN(cardExpiryMonth) || cardExpiryMonth.length !== constants.CARD_EXPIRY_MONTH_LENGTH || cardExpiryMonth < constants.CARD_EXPIRY_MONTH_MIN || cardExpiryMonth > constants.CARD_EXPIRY_MONTH_MAX) {
        errors.push(`1Invalid Card Expiry Month. It should be a ${constants.CARD_EXPIRY_MONTH_LENGTH}-digit number between ${constants.CARD_EXPIRY_MONTH_MIN} and ${constants.CARD_EXPIRY_MONTH_MAX}.`);
    }

    // Check card expiry year is a 2 digit number
    if (isNaN(cardExpiryYear) || cardExpiryYear.length !== constants.CARD_EXPIRY_YEAR_LENGTH) {
        errors.push(`Invalid Card Expiry Year. It should be a ${constants.CARD_EXPIRY_YEAR_LENGTH}-digit number.`);
    }

    // Check card CVV is a 3 digit number
    if (cardCVV.length !== constants.CARD_CVV_LENGTH || !constants.ALLOWED_NUMERIC.test(cardCVV)) {
        errors.push(`Invalid Card CVV. It should be a ${constants.CARD_CVV_LENGTH}-digit number.`);
    }

    // Throw error if any validation fails
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
}

// Function to process the payment
async function processPayment(orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV) {
    const apiVersionNumber = process.env.API_VERSION_NUMBER;
    const merchantID = process.env.MERCHANT_ID;
    const transactionID = getTransactionID();
    const domain = process.env.PAYMENT_GATEWAY_DOMAIN;
    const logPath = process.env.LOG_PATH;
    const url = `${domain}/api/rest/version/${apiVersionNumber}/merchant/${merchantID}/order/${orderNumber}/transaction/${transactionID}`;

    const requestBody = {
        apiOperation: 'PAY',
        order: {
            amount: parseFloat(amount),
            currency: 'NZD',
        },
        sourceOfFunds: {
            type: 'CARD',
            provided: {
                card: {
                    number: cardNumber,
                    securityCode: cardCVV,
                    expiry: {
                        month: cardExpiryMonth,
                        year: cardExpiryYear,
                    },
                },
            },
        },
    };

    try {
        const response = await axios.put(url, requestBody);
        const { gatewayCode, acquirerMessage } = response.data.response;
        if (gatewayCode === 'APPROVED') {
            console.log('Payment Successful:', acquirerMessage);
            incrementTransactionID();

            // Add order number to orderNumber.json
            addOrderNumber(orderNumber);
        } else {
            console.log('Payment Failed:', acquirerMessage);
        }
    } catch (error) {
        const errorMessage = `Error response data: ${error.response ? error.response.data : 'N/A'}\n` +
                             `Error response status: ${error.response ? error.response.status : 'N/A'}\n` +
                             `Error response headers: ${error.response ? error.response.headers : 'N/A'}\n` +
                             `Error request data: ${error.request ? error.request : 'N/A'}\n` +
                             `Error message: ${error.message}\n` +
                             `Error config: ${JSON.stringify(error.config)}\n`;

        // Log the error to the console
        console.error('An error occurred while processing the payment. Please check the logs for more details.');

        // Write the full error to the log file
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${errorMessage}\n`);
    }
}

// Main function to run the console application
async function main() {
    while (true) {
        try {
            const { orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV } = getUserInput();

            validateInput(orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV);

            await processPayment(orderNumber, amount, cardNumber, cardExpiryMonth, cardExpiryYear, cardCVV);
        } catch (error) {
            console.error(error.message);
        }

        let continueInput;
        while (true) {
            continueInput = getInput('Do you want to process another payment? (yes/no): ').toLowerCase();
            if (continueInput === 'yes' || continueInput === 'y') {
                break;
            } else if (continueInput === 'no' || continueInput === 'n') {
                console.log('Exiting the application.');
                return;
            } else {
                console.log('Invalid input. Please enter "yes/y" or "no/n".');
            }
        }
    }
}

// Only run main if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { validateInput, processPayment, main, getUserInput };