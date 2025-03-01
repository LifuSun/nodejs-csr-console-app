const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const readlineSync = require('readline-sync');
const fs = require('fs');
const constants = require('../constants');
const { validateInput, processPayment, main } = require('../index');
const transactionID = require('../transactionID');
const { isOrderNumberUnique, addOrderNumber } = require('../orderNumber');

// Mock readlineSync
sinon.stub(readlineSync, 'question').callsFake((prompt) => {
    const responses = {
        'Enter Order Number: ': 'A1B2C3D4E5',
        'Enter Amount: ': '100.00',
        'Enter Card Number: ': '1234567812345678',
        'Enter Card Expiry Month (MM): ': '12',
        'Enter Card Expiry Year (YY): ': '25',
        'Enter Card CVV: ': '123',
    };
    return responses[prompt];
});

// Mock transactionID functions
const getTransactionIDStub = sinon.stub(transactionID, 'getTransactionID').returns(1);
const incrementTransactionIDStub = sinon.stub(transactionID, 'incrementTransactionID');

// Mock main function
const mainStub = sinon.stub(main);

// Mock fs functions
const readFileSyncStub = sinon.stub(fs, 'readFileSync').callsFake((path) => {
    if (path.endsWith('orderNumber.json')) {
        return '[]';
    }
    return fs.readFileSync.wrappedMethod.call(fs, path);
});
const writeFileSyncStub = sinon.stub(fs, 'writeFileSync');

describe('validateInput', () => {
    it('should validate correct input', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '123')).to.not.throw();
    });

    it('should throw error for invalid order number', () => {
        expect(() => validateInput('A1B2C3D4E', '100.00', '1234567812345678', '12', '25', '123')).to.throw('Invalid Order Number. It should be 10 alphanumeric characters.');
    });

    it('should throw error for invalid amount', () => {
        expect(() => validateInput('A1B2C3D4E5', '100', '1234567812345678', '12', '25', '123')).to.throw('Invalid Amount. It should be a number rounded to 2 decimal places.');
    });

    it('should throw error for invalid card number (too short)', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '123456781234567', '12', '25', '123')).to.throw('Invalid Card Number. It should be 16 numeric characters, but it has only 15 characters.');
    });

    it('should throw error for invalid card number (too long)', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '12345678123456789', '12', '25', '123')).to.throw('Invalid Card Number. It should be 16 numeric characters, but it has 17 characters.');
    });

    it('should throw error for invalid card expiry month', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '1234567812345678', '13', '25', '123')).to.throw('Invalid Card Expiry Month. It should be a 2-digit number between 01 and 12.');
    });

    it('should throw error for invalid card expiry year', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '1234567812345678', '12', '2', '123')).to.throw('Invalid Card Expiry Year. It should be a 2-digit number.');
    });

    it('should throw error for invalid card CVV', () => {
        expect(() => validateInput('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '12')).to.throw('Invalid Card CVV. It should be a 3-digit number.');
    });

    it('should throw error for duplicate order number', () => {
        readFileSyncStub.withArgs(sinon.match(/orderNumber\.json$/)).returns(JSON.stringify(['A1B2C3D4E5']));
        expect(() => validateInput('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '123')).to.throw('Order Number already exists. Please use a unique Order Number.');
    });
});

describe('processPayment', () => {
    let axiosPutStub;
    let consoleLogStub;
    let consoleErrorStub;
    let fsAppendFileSyncStub;

    beforeEach(() => {
        axiosPutStub = sinon.stub(axios, 'put');
        consoleLogStub = sinon.stub(console, 'log');
        consoleErrorStub = sinon.stub(console, 'error');
        fsAppendFileSyncStub = sinon.stub(fs, 'appendFileSync');
    });

    afterEach(() => {
        axiosPutStub.restore();
        consoleLogStub.restore();
        consoleErrorStub.restore();
        fsAppendFileSyncStub.restore();
        writeFileSyncStub.resetHistory();
    });

    it('should process payment successfully', async () => {
        axiosPutStub.resolves({
            data: {
                response: {
                    gatewayCode: 'APPROVED',
                    acquirerMessage: 'Approved',
                },
            },
        });

        await processPayment('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '123');
        expect(consoleLogStub.calledWith('Payment Successful:', 'Approved')).to.be.true;
        expect(incrementTransactionIDStub.calledOnce).to.be.true;
        expect(writeFileSyncStub.notCalled).to.be.true; // Ensure the order number is not added to the JSON file during tests
    });

    it('should handle payment failure', async () => {
        axiosPutStub.resolves({
            data: {
                response: {
                    gatewayCode: 'DECLINED',
                    acquirerMessage: 'Do not honour',
                },
            },
        });

        await processPayment('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '123');
        expect(consoleLogStub.calledWith('Payment Failed:', 'Do not honour')).to.be.true;
        expect(incrementTransactionIDStub.notCalled).to.be.true;
        expect(writeFileSyncStub.notCalled).to.be.true; // Ensure the order number is not added to the JSON file during tests
    });

    it('should handle axios error response and write to log', async () => {
        axiosPutStub.rejects({
            response: {
                data: 'Error data',
                status: 400,
                headers: 'Error headers',
            },
        });

        await processPayment('A1B2C3D4E5', '100.00', '1234567812345678', '12', '25', '123');
        const expectedErrorMessage = `Error response data: Error data\n` +
                                     `Error response status: 400\n` +
                                     `Error response headers: Error headers\n` +
                                     `Error request data: N/A\n` +
                                     `Error message: undefined\n` +
                                     `Error config: {}\n`;

        expect(fsAppendFileSyncStub.calledOnce).to.be.true;
        expect(fsAppendFileSyncStub.calledWith(sinon.match.string, sinon.match(expectedErrorMessage))).to.be.true;
        expect(consoleErrorStub.calledWith('An error occurred while processing the payment. Please check the logs for more details.')).to.be.true;
        expect(incrementTransactionIDStub.notCalled).to.be.true;
        expect(writeFileSyncStub.notCalled).to.be.true; // Ensure the order number is not added to the JSON file during tests
    });
});