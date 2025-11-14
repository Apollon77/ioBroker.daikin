const path = require('path');
const { tests } = require('@iobroker/testing');

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    // The adapter requires a device IP to run. Without it, it exits with code 11
    // which is expected behavior
    allowedExitCodes: [11],
});
