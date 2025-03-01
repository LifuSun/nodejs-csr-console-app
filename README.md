# Node.js CSR Console App

This is a Node.js console application for processing payments using card details. The application validates user input and processes payments through a payment gateway.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/get-npm) (Node Package Manager)

## Installation

Follow these steps to install and run the application on a Linux or Windows device:

1. **Clone the repository**:
    ```sh
    git clone https://github.com/your-repo/nodejs-csr-console-app.git
    cd nodejs-csr-console-app
    ```

2. **Install dependencies**:
    ```sh
    npm install
    ```

3. **Create a `.env` file**:
    Create a `.env` file in the root directory of the project and add the following environment variables:
    ```env
    API_VERSION_NUMBER=your_api_version_number
    MERCHANT_ID=your_merchant_id
    PAYMENT_GATEWAY_DOMAIN=your_payment_gateway_domain
    LOG_PATH=payment_errors.log
    ```

4. **Run the application**:
    ```sh
    node index.js
    ```

## Usage

The application will prompt you to enter the following details:
- Order Number (10 alphanumeric characters)
- Amount (a number with 2 decimal places)
- Card Number (16 numeric characters)
- Card Expiry Month (MM)
- Card Expiry Year (YY)
- Card CVV (3 numeric characters)

The application will validate the input and process the payment. If the payment is successful, it will display a success message. If the payment fails, it will display a failure message.

## Running Tests

To run the unit tests, use the following command:
```sh
npx mocha
```

## Making the Console App Executable

To make the console app into an executable, follow these steps:

1. **Install `pkg`**:
    ```sh
    npm install -g pkg
    ```

2. **Build the executable**:
    ```sh
    pkg . --out-path ./build
    ```

This will create an executable file in the `./build` directory for your operating system.

# Deliverables

## Overview

I started the development noting down the key points from the exercise:

- It's a console application
- It's used by CSR user
- It's meant to accept card number
- The app should be executable on Windows device
- CSR user needs to input the following values into console:
  - Order Number: 10 character long, only alphanumeric values
  - Amount
  - Card Number
  - Card Expiry
  - Card CVV
- App should let CSR user know whether payment was successfully made
- App should let CSR user know if payment failed, why
- Use dummy request and domain name for payment gateway
- App created should be; iterable, maintainable and resilient
- Will not be assessed on validity of request and response, but on how the request and response are structured and handled
- Should be achieved in under 2 hours

The app is simple enough that most of the functionalities are in the `index.js` file. 

I created 2 additional js files:

- `orderNumber.js`, to store functions relating to order numbers
- `transactionID.js`, to store functions relating to transaction ids.

I created 2 files to store app variables:

- `.env`, to store environment variables that's unique to per customer/merchant
- `constants.js`, to act as my enum data, to store static variables

I created 2 files to store variables:

- `orderNumber.json`, to store the order numbers of payments that were successful
- `transactionId.json`, to store the current transaction number to be used in payment URL

During development, to save time testing the app after changes, I made a unit test for index.js located in `test/index.test.js`.

## Assumptions made

During development, I made the following assumptions for problems I encountered:

- Order Number is stated to be 10 character length
- Transaction Amount should be rounded to 2 decimal place/double
- Card Length is 16 characters
- Card Expiry Month and Year on cards are written in MM/YY
- Card CVV are normally 3 characters. 

The assumptions are stored as variables in `constants.js` that can be changed in the future. 

The merchants are NZ customers, therefore use NZ format are used for Card details and API payload.

As this is a console app, I don't expect it to have DB access, therefore:

- Order Number, which needs to be unique, is stored locally in `orderNumber.json` when payment is successful
- Transaction ID, that's used for payment URL, is stored locally in `transactionID.json` when payment is successful

The CSR user is not technical enough to understand HTTP errors, therefore a simple error message will be displayed for payments that are not APPROVED/successful or DECLINED/failed.

However, the actual HTTP error is stored in the log file for someone technical to read and remediate. 

## Shortcuts/Compromises made

Wrote a basic unit test and tried to keep it up to date as I made changes to `index.js`, but my inexperience and time meant some of the tests fail. 

Without DB access, dynamic variables need to be stored locally in a json file. 

Some of the API payload parameters should have probably been turned into variables in `.env` file, but the unsurety meant I left it as it is. 

## Desired Improvements

### DB access 

The `orderNumber.json` and `transactionID.json` are exposed to anyone with read access, could become a security vulnerability, and be used maliciously against the merchant. 

### More unit tests

I made a quick unit test for `index.js` to save time testing the app functionality. 
However further into development, and adding more complexity like reading and writing to `orderNumber.json` and `transactionID.json` made some of the previous unit tests invalid. 
I never got around the time to fix the unit test, though the core unit test function still worked. 
Also I never got time to write unit tests for `orderNumber.js` and `transactionID.js`. 

### Payment activities

I didn't get around time to add activity details to successful and failed payment transactions. 
Right now, only tracks successful payments. 

### Login functionality

I presume merchants can have multiple CSR users. 
I would like to have the payment actions to be made associated with per user for: 
- record keeping
- reconciliation
- mistakes
- malicious actors