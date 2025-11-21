const path = require('path');
const http = require('http');
const { tests } = require('@iobroker/testing');
const { expect } = require('chai');

// Mock HTTP server for Daikin API
let server;
let responses = [];
let requestError = false;

function setupHttpServer(callback) {
    // Define response patterns that can be reused for polling
    const responsePatterns = {
        'GET /common/basic_info': 'ret=OK,type=aircon,reg=eu,dst=1,ver=2_6_0,pow=0,err=0,location=0,name=%4b%6c%69%6d%61%20%4a%61%6e%61,icon=0,method=home only,port=30050,id=,pw=,lpw_flag=0,adp_kind=2,pv=0,cpv=0,cpv_minor=00,led=0,en_setzone=1,mac=A408EACC91D4,adp_mode=run,en_hol=0,grp_name=%4b%69%6e%64%65%72,en_grp=1',
        'GET /aircon/get_model_info': 'ret=OK,model=NOTSUPPORT,type=N,pv=0,cpv=0,mid=NA,s_fdir=1,en_scdltmr=1',
        'POST /aircon/set_special_mode': 'ret=OK,adv=',
        'POST /aircon/set_control_info': 'ret=OK,adv=',
    };

    let requestCount = 0;
    requestError = false;

    server = http.createServer((request, response) => {
        console.log(`HTTP-Server: Request: ${request.method} ${request.url}`);
        const requestKey = `${request.method} ${request.url}`;

        // Handle requests that have fixed responses
        if (responsePatterns[requestKey]) {
            response.end(responsePatterns[requestKey]);
            return;
        }

        // Handle dynamic responses based on request count (for polling simulation)
        if (requestKey === 'GET /aircon/get_control_info') {
            requestCount++;
            if (requestCount >= 3) {
                // After state changes (targetTemp 21.0)
                response.end(
                    'ret=OK,pow=0,mode=2,adv=12/13,stemp=21.0,shum=0,dt1=25.0,dt2=M,dt3=23.0,dt4=27.0,dt5=27.0,dt7=25.0,dh1=AUTO,dh2=50,dh3=0,dh4=0,dh5=0,dh7=AUTO,dhh=50,b_mode=3,b_stemp=23.0,b_shum=0,alert=255,f_rate=A,f_dir=0,b_f_rate=A,b_f_dir=0,dfr1=5,dfr2=5,dfr3=A,dfr4=5,dfr5=5,dfr6=5,dfr7=5,dfrh=5,dfd1=0,dfd2=0,dfd3=0,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0',
                );
            } else if (requestCount === 2) {
                // After first poll (special mode econo)
                response.end(
                    'ret=OK,pow=0,mode=2,adv=12,stemp=25.0,shum=0,dt1=25.0,dt2=M,dt3=23.0,dt4=27.0,dt5=27.0,dt7=25.0,dh1=AUTO,dh2=50,dh3=0,dh4=0,dh5=0,dh7=AUTO,dhh=50,b_mode=3,b_stemp=23.0,b_shum=0,alert=255,f_rate=A,f_dir=0,b_f_rate=A,b_f_dir=0,dfr1=5,dfr2=5,dfr3=A,dfr4=5,dfr5=5,dfr6=5,dfr7=5,dfrh=5,dfd1=0,dfd2=0,dfd3=0,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0',
                );
            } else {
                // Initial response
                response.end(
                    'ret=OK,pow=0,mode=2,adv=2/13,stemp=23.0,shum=0,dt1=25.0,dt2=M,dt3=23.0,dt4=27.0,dt5=27.0,dt7=25.0,dh1=AUTO,dh2=50,dh3=0,dh4=0,dh5=0,dh7=AUTO,dhh=50,b_mode=3,b_stemp=23.0,b_shum=0,alert=255,f_rate=A,f_dir=0,b_f_rate=A,b_f_dir=0,dfr1=5,dfr2=5,dfr3=A,dfr4=5,dfr5=5,dfr6=5,dfr7=5,dfrh=5,dfd1=0,dfd2=0,dfd3=0,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0',
                );
            }
        } else if (requestKey === 'GET /aircon/get_sensor_info') {
            // Return 23.5 initially, then 25.5 after first poll
            if (requestCount >= 2) {
                response.end('ret=OK,htemp=25.5,hhum=-,otemp=-,err=0,cmpfreq=0');
            } else {
                response.end('ret=OK,htemp=23.5,hhum=-,otemp=-,err=0,cmpfreq=0');
            }
        } else {
            console.log('ERROR - unknown request');
            response.end('ret=PARAM NG');
        }
    });

    server.listen(8080, () => {
        console.log('HTTP-Server listening on: http://localhost:8080');
        callback();
    });
}

function stopHttpServer(callback) {
    if (server) {
        server.close(() => {
            console.log('HTTP-Server stopped');
            callback();
        });
    } else {
        callback();
    }
}

// Helper function to wait for a state to reach a specific value
async function waitForState(harness, stateId, expectedValue, timeoutMs = 20000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const state = await harness.states.getStateAsync(stateId);
        if (state && state.val === expectedValue) {
            return state;
        }
        await new Promise((res) => setTimeout(res, 500));
    }
    throw new Error(`Timeout waiting for ${stateId} to become ${expectedValue}`);
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    // The adapter requires a device IP to run. Without it, it exits with code 11
    allowedExitCodes: [11],

    defineAdditionalTests({ suite }) {
        // Test with mock HTTP server - startup and initial values
        suite('Test adapter startup with mock Daikin device', (getHarness) => {
            let harness;

            // Setup before tests
            before(function (done) {
                this.timeout(10000);
                setupHttpServer(done);
            });

            // Cleanup after tests
            after(function (done) {
                this.timeout(5000);
                if (harness) {
                    harness.stopAdapter().then(() => stopHttpServer(done));
                } else {
                    stopHttpServer(done);
                }
            });

            it('Should start adapter and read initial values', async function () {
                harness = getHarness();
                this.timeout(90000);

                // Configure adapter to use our mock server
                await harness.changeAdapterConfig('daikin', {
                    native: {
                        daikinIp: '127.0.0.1:8080',
                        pollingInterval: 10, // Shorter interval for faster tests
                        useGetToPost: false,
                    },
                    common: {
                        enabled: true,
                        loglevel: 'debug',
                    },
                });

                // Start the adapter and wait until it has started
                await harness.startAdapterAndWait();

                // Wait for initial data to be read
                await new Promise((res) => setTimeout(res, 5000));

                // Check that connection state is true (connected to mock server)
                const connectionState = await harness.states.getStateAsync('daikin.0.info.connection');
                expect(connectionState, 'Connection state should exist').to.not.be.null;
                expect(connectionState.val, 'Connection should be true when device is available').to.be.true;

                // Check initial indoor temperature (23.5)
                let tempState = await harness.states.getStateAsync('daikin.0.sensorInfo.indoorTemperature');
                expect(tempState, 'Indoor temperature state should exist').to.not.be.null;
                expect(tempState.val, 'Indoor temperature should be 23.5').to.equal(23.5);

                // Check that device info was created
                const deviceName = await harness.states.getStateAsync('daikin.0.deviceInfo.name');
                expect(deviceName, 'Device name should exist').to.not.be.null;

                // Wait for the next polling cycle to get updated temperature (25.5)
                await new Promise((res) => setTimeout(res, 15000));

                // Check updated temperature value
                tempState = await harness.states.getStateAsync('daikin.0.sensorInfo.indoorTemperature');
                expect(tempState, 'Indoor temperature state should exist').to.not.be.null;
                expect(tempState.val, 'Indoor temperature should be updated to 25.5').to.equal(25.5);
            });

            it('Should set values correctly', async function () {
                this.timeout(40000);

                // Set target temperature to 20
                await harness.states.setStateAsync('daikin.0.control.targetTemperature', {
                    val: 20.0,
                    ack: false,
                });

                // Set special streamer mode
                await harness.states.setStateAsync('daikin.0.control.specialStreamer', {
                    val: true,
                    ack: false,
                });

                // Wait for the adapter to process and the mock server to respond
                // The mock server will return targetTemperature as 21.0 after processing
                await waitForState(harness, 'daikin.0.control.targetTemperature', 21.0);

                const tempState = await harness.states.getStateAsync('daikin.0.control.targetTemperature');
                expect(tempState, 'Target temperature should exist').to.not.be.null;
                expect(tempState.val, 'Target temperature should be updated to 21.0').to.equal(21.0);
            });
        });

        // Test discovery functionality
        suite('Test discovery message', (getHarness) => {
            let harness;

            before(function (done) {
                this.timeout(10000);
                setupHttpServer(done);
            });

            after(function (done) {
                this.timeout(5000);
                stopHttpServer(done);
            });

            it('Should respond to discover message', async function () {
                harness = getHarness();
                this.timeout(30000);

                // Configure and start adapter
                await harness.changeAdapterConfig('daikin', {
                    native: {
                        daikinIp: '127.0.0.1:8080',
                        pollingInterval: 300,
                        useGetToPost: false,
                    },
                    common: {
                        enabled: true,
                    },
                });

                await harness.startAdapterAndWait();

                // Wait for adapter to be ready
                await new Promise((res) => setTimeout(res, 2000));

                // Send discover message
                const response = await new Promise((resolve) => {
                    harness.sendTo('daikin.0', 'discover', null, (resp) => {
                        resolve(resp);
                    });
                });

                // Response should have devices property (even if empty)
                expect(response, 'Response should exist').to.not.be.null;
                expect(response).to.have.property('devices');

                await harness.stopAdapter();
            });
        });
    },
});
