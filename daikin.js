/* jshint -W097 */
// jshint strict:true
/*jslint node: true */
/*jslint esversion: 6 */
'use strict';
/**
 *
 * Daikin adapter
 */
// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
let adapter;

const DaikinController = require('daikin-controller');
let daikinDevice;
let deviceName = '';
let changedStates = {};
const updatedStates = {};
let changeTimeout = null;
let changeRunning = false;
let stopped = false;
let connected = null;

const Mode = {'0': 'AUTO', '1': 'AUTO1', '2': 'DEHUMID', '3': 'COLD', '4': 'HOT', '6': 'FAN', '7': 'AUTO2'};
const FanRate = {
    'A': 'AUTO',
    'B': 'SILENCE',
    '3': 'LEVEL_1',
    '4': 'LEVEL_2',
    '5': 'LEVEL_3',
    '6': 'LEVEL_4',
    '7': 'LEVEL_5'
};
const FanDirection = {'0': 'STOP', '1': 'VERTICAL', '2': 'HORIZONTAL', '3': 'VERTICAL_AND_HORIZONTAL'};
const SpecialMode = {
    '': 'NONE',
    '2': 'POWERFUL',
    '12': 'ECONO',
    '13': 'STREAMER',
    '2/13': 'POWERFUL/STREAMER',
    '12/13': 'ECONO/STREAMER'
};

const DemandControlType = {'0': 'UNSUPPORTED', '1': 'SUPPORTED'};
const DemandControlMode = {'0': 'MANUAL', '1': 'TIMER', '2': 'AUTO'};

const channelDef = {
    'deviceInfo': {'role': 'info'},
    'control': {'role': 'thermo'},
    'controlInfo': {'role': 'info'},
    'demandControl': {'role': 'info'},
    'modelInfo': {'role': 'info'},
    'sensorInfo': {'role': 'info'}
};

const fieldDef = {
    'deviceInfo': {
        'type': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'region': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'dst': {'role': 'indicator', 'read': true, 'write': false, 'type': 'boolean'},
        'adapterVersion': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        //'power':          {'role': '', 'read': true, 'write': false, 'type': 'boolean', 'altValues': Power},
        'location': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'name': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'icon': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'method': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'port': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'id': {'role': 'text', 'read': true, 'write': false, 'type': 'string'}, // unit identifier
        'password': {'role': 'text', 'read': true, 'write': false, 'type': 'string'}, // password
        'lpwFlag': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'pv': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpv': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpvMinor': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'led': {'role': 'button', 'read': true, 'write': false, 'type': 'boolean'}, // status LED on or off
        'enSetzone': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'macAddress': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'adapterMode': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'error': {'role': 'value', 'read': true, 'write': false, 'name': 'error', 'type': 'number'},		// 255
        'enHol': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'enGroup': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'groupName': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'adapterKind': {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    },
    'control': {
        'power': {'role': 'switch', 'read': true, 'write': true, 'type': 'boolean'},
        'mode': {'role': 'level', 'read': true, 'write': true, 'type': 'number', 'states': Mode, 'min': 0, 'max': 7},
        'targetTemperature': {
            'role': 'level.temperature',
            'read': true,
            'write': true,
            'type': 'number',
            'min': 10,
            'max': 41,
            'unit': '°C'
        },
        'targetHumidity': {
            'role': 'level.humidity',
            'read': true,
            'write': true,
            'type': 'number',
            'min': 0,
            'max': 50,
            'unit': '%'
        },		// "AUTO" or number from 0..50
        'fanRate': {'role': 'text', 'read': true, 'write': true, 'type': 'string', 'states': FanRate},
        'fanDirection': {'role': 'level', 'read': true, 'write': true, 'type': 'number', 'states': FanDirection},
        'specialPowerful': {'role': 'switch.boost', 'read': true, 'write': true, 'type': 'boolean'},
        'specialEcono': {'role': 'switch', 'read': true, 'write': true, 'type': 'boolean'},
        'specialStreamer': {'role': 'switch', 'read': true, 'write': true, 'type': 'boolean'}
    },
    'controlInfo': {
        // the following are returned, but not set-able
        'specialMode': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': SpecialMode},

        'targetTemperatureMode1': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },		// "M" or number 10..41
        'targetTemperatureMode2': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'targetTemperatureMode3': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'targetTemperatureMode4': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'targetTemperatureMode5': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'targetTemperatureMode7': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },

        'targetHumidityMode1': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityMode2': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityMode3': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityMode4': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityMode5': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityMode7': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number
        'targetHumidityModeH': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},		// AUTO or number

        'fanRateMode1': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode2': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode3': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode4': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode5': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode6': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode7': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateModeH': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},

        'fanDirectionMode1': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode2': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode3': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode4': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode5': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode6': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode7': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionModeH': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},

        'modeB': {'role': 'level', 'read': true, 'write': false, 'type': 'number', 'states': Mode},
        'targetTemperatureB': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'targetHumidityB': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},
        'fanRateB': {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanDirectionB': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},

        'error': {'role': 'value', 'read': true, 'write': false, 'type': 'number'}		// 255
    },
    'demandControl': {
        'enabled': {'role': 'switch', 'read': true, 'write': false, 'type': 'boolean'}, // can be writable later
        'type': {'role': 'level', 'read': true, 'write': false, 'type': 'number', 'states': DemandControlType},
        'mode': {'role': 'level', 'read': true, 'write': false, 'type': 'number', 'states': DemandControlMode}, // can be writable later
        'maxPower': {
            'role': 'level.power',
            'read': true,
            'write': true,
            'type': 'number',
            'min': 40,
            'max': 100,
            'unit': '%'
        },		// number from 40..100 and must be a multiply of 5
    },
    'modelInfo': {
        'model': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'type': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'pv': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpv': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'mid': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'sFanDirection': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'enScdltmr': {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    },
    'sensorInfo': {
        'indoorTemperature': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'indoorHumidity': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},
        'outdoorTemperature': {
            'role': 'value.temperature',
            'read': true,
            'write': false,
            'type': 'number',
            'unit': '°C'
        },
        'error': {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cmpfreq': {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    }
};

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'daikin'
    });
    adapter = new utils.Adapter(options);

    adapter.on('ready', async () => {
        await adapter.extendObjectAsync(adapter.namespace, {
            common: {
                statusStates: {
                    onlineId: `${adapter.namespace}.info.connection`
                }
            }
        });
        main();
    });

    adapter.on('message', function (msg) {
        processMessage(msg);
    });

    adapter.on('stateChange', function (id, state) {
        if (!state || state.ack !== false || state.val === null) return;
        adapter.log.debug(`stateChange ${id} ${JSON.stringify(state)}`);
        const realNamespace = `${adapter.namespace}.control.`;
        const realNamespace2 = `${adapter.namespace}.demandControl.`;

        // Hacky: two namespaces and assume uniqueness of the variable independent of the namespace
        // To be checked with Apollon77
        const stateId = id.startsWith(realNamespace) ? id.substring(realNamespace.length) : id.substring(realNamespace2.length);
        changedStates[stateId] = state.val;
        if (changeTimeout) {
            adapter.log.debug('Clear change timeout');
            clearTimeout(changeTimeout);
            changeTimeout = null;
        }
        changeTimeout = setTimeout(changeStates, 1000);
    });

    adapter.on('unload', function (callback) {
        stopped = true;
        if (daikinDevice) {
            adapter.log.debug('Stopping update timeout');
            daikinDevice.stopUpdate();
        }
        if (changeTimeout) {
            adapter.log.debug('Clear change timeout');
            clearTimeout(changeTimeout);
            changeTimeout = null;
        }
        setConnected(false);
        if (callback) callback();
    });

    return adapter;
}

function changeStates() {
    if (changeRunning) {
        adapter.log.info('postpone state changes because last change not finished');
        changeTimeout = setTimeout(changeStates, 1000);
        return;
    }
    changeTimeout = null;
    changeRunning = true;
    const changed = changedStates;
    changedStates = {};

    adapter.log.debug(`Send ${Object.keys(changed).length} changes: ${JSON.stringify(changed)}`);
    if (changed.mode !== undefined) { // we change mode
        if (Object.keys(changed).length === 1) { // and we change mode only, so init all values from last
            adapter.log.debug('we changed mode only');
            if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== null) {
                changed.targetTemperature = daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`];
                adapter.log.debug(`changed targetTemperature to ${changed.targetTemperature}`);
            }
            else if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.targetTemperatureMode1 !== undefined && daikinDevice.currentACControlInfo.targetTemperatureMode1 !== null) {
                changed.targetTemperature = daikinDevice.currentACControlInfo.targetTemperatureMode1;
                adapter.log.debug(`changed targetTemperature to Mode 1:${changed.targetTemperature}`);
            }
            else {
                changed.targetTemperature = 23;
                adapter.log.debug('changed targetTemperature to fixed 23');
            }
            if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== null) {
                changed.targetHumidity = daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`];
                adapter.log.debug(`changed targetHumidity to ${changed.targetHumidity}`);
            }
            else if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.targetHumidityMode1 !== undefined && daikinDevice.currentACControlInfo.targetHumidityMode1 !== null) {
                changed.targetHumidity = daikinDevice.currentACControlInfo.targetHumidityMode1;
                adapter.log.debug(`changed targetHumidity to Mode 1: ${changed.targetHumidity}`);
            }
            else {
                changed.targetHumidity = 0;
                adapter.log.debug('changed targetHumidity to fixed 0');
            }
            if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`] !== null) {
                changed.fanRate = daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`];
                adapter.log.debug(`changed fanRate to ${changed.fanRate}`);
            }
            else if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.fanRateMode1 !== undefined && daikinDevice.currentACControlInfo.fanRateMode1 !== null) {
                changed.fanRate = daikinDevice.currentACControlInfo.fanRateMode1;
                adapter.log.debug(`changed fanRate to Mode 1: ${changed.fanRate}`);
            }
            if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`] !== null) {
                changed.fanDirection = daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`];
                adapter.log.debug(`changed fanDirection to ${changed.fanDirection}`);
            }
            else if (daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.fanDirectionMode1 !== undefined && daikinDevice.currentACControlInfo.fanDirectionMode1 !== null) {
                changed.fanDirection = daikinDevice.currentACControlInfo.fanDirectionMode1;
                adapter.log.debug(`changed fanDirection to Mode 1: ${changed.fanDirection}`);
            }
        }
        else {
            adapter.log.debug('we changed mode and other field');
            if (changed.targetTemperature === undefined && daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.targetTemperature === null) {
                if (daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== null) {
                    changed.targetTemperature = daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`];
                    adapter.log.debug(`changed targetTemperature to ${changed.targetTemperature}`);
                }
                else if (daikinDevice.currentACControlInfo.targetTemperatureMode1 !== undefined && daikinDevice.currentACControlInfo.targetTemperatureMode1 !== null) {
                    changed.targetTemperature = daikinDevice.currentACControlInfo.targetTemperatureMode1;
                    adapter.log.debug(`changed targetTemperature to Mode 1: ${changed.targetTemperature}`);
                }
                else {
                    changed.targetTemperature = 23;
                    adapter.log.debug('changed targetTemperature to fixed 23');
                }
            }
            if (changed.targetHumidity === undefined && daikinDevice.currentACControlInfo && daikinDevice.currentACControlInfo.targetHumidity === null) {
                if (daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== undefined && daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== null) {
                    changed.targetHumidity = daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`];
                    adapter.log.debug(`changed targetHumidity to ${changed.targetHumidity}`);
                }
                else if (daikinDevice.currentACControlInfo.targetHumidityMode1 !== undefined && daikinDevice.currentACControlInfo.targetHumidityMode1 !== null) {
                    changed.targetHumidity = daikinDevice.currentACControlInfo.targetHumidityMode1;
                    adapter.log.debug(`changed targetHumidity to Mode 1: ${changed.targetHumidity}`);
                }
                else {
                    changed.targetHumidity = 0;
                    adapter.log.debug('changed targetHumidity to fixed 0');
                }
            }
        }
    }
    if (changed.maxPower !== undefined) {
        daikinDevice.setACDemandControl({maxPower: changed.maxPower}, (err, response) => {
            adapter.log.debug(`changed maxPower to ${changed.maxPower}, response ${JSON.stringify(response)}`);
            if (err) adapter.log.error(`change values failed: ${err.message}`);
            delete changed.maxPower;
            setSpecialMode(changed);
        });
        return;
    }
    setSpecialMode(changed);
}

function setConnected(isConnected) {
    if (connected !== isConnected) {
        connected = isConnected;
        adapter && adapter.setState('info.connection', connected, true, (err) => {
            // analyse if the state could be set (because of permissions)
            if (err && adapter && adapter.log) {
                adapter.log.error('Can not update connected state: ' + err);
            }
            else if (adapter && adapter.log) {
                adapter.log.debug('connected set to ' + connected);
            }
        });
    }
}

function setSpecialMode(changed) {
    if (changed.specialPowerful !== undefined) {
        daikinDevice.setACSpecialMode({state: (changed.specialPowerful?'1':'0'), kind: DaikinController.SpecialModeKind.POWERFUL}, () => {
            delete changed.specialPowerful;
            if (updatedStates.control) {
                updatedStates.control.specialPowerful = '';
            } // reset stored value
            setSpecialMode(changed);
        });
        return;
    }
    if (changed.specialEcono !== undefined) {
        daikinDevice.setACSpecialMode({state: (changed.specialEcono? '1' : '0'), kind: DaikinController.SpecialModeKind.ECONO}, () => {
            delete changed.specialEcono;
            if (updatedStates.control) {
                updatedStates.control.specialEcono = '';
            } // reset stored value
            setSpecialMode(changed);
        });
        return;
    }
    if (changed.specialStreamer !== undefined) {
        daikinDevice.setACSpecialMode({state: (changed.specialStreamer? '1' : '0'), kind: DaikinController.SpecialModeKind.STREAMER}, () => {
            delete changed.specialStreamer;
            if (updatedStates.control) {
                updatedStates.control.specialStreamer = '';
            } // reset stored value
            setSpecialMode(changed);
        });
        return;
    }

    if (Object.keys(changed).length > 0) { // and we change mode only, so init all values from last
        setControlInfo(changed);
    }
    else {
        changeRunning = false;
        daikinDevice.updateData();
    }
}

function setControlInfo(changed) {
    daikinDevice.setACControlInfo(changed, (err, response) => {
        if (updatedStates.control) {
            adapter.log.debug(`change values: ${JSON.stringify(response)} to ${JSON.stringify(response)}`);
            if (err) adapter.log.error(`change values failed: ${err.message}`);
            for (const fieldName in changed) {
                updatedStates.control[fieldName] = ''; // reset stored value
                adapter.log.debug(`reset ${fieldName}`);
            }
        }
        changeRunning = false;
        storeDaikinData(err);
    });
}

function main() {
    setConnected(false);
    const options = {};
    if (adapter.common.loglevel === 'debug') {
        options.logger = adapter.log.debug
    }
/*    else if (adapter.common.loglevel === 'info') {
        options.logger = adapter.log.info;
    }*/
    if (!adapter.config.daikinIp) {
        adapter.log.error('No IP set for Daikin Device, check your configuration!');
        typeof adapter.terminate === 'function' ? adapter.terminate(11) : process.exit(11);
        return;
    }
    if (adapter.config.pollingInterval !== null && adapter.config.pollingInterval !== undefined && adapter.config.pollingInterval !== "") {
        adapter.config.pollingInterval = parseInt(adapter.config.pollingInterval, 10);
    }
    else adapter.config.pollingInterval = 300;
    if (adapter.config.useGetToPost) {
        options.useGetToPost = true;
    }

    daikinDevice = new DaikinController.DaikinAC(adapter.config.daikinIp, options,  (err, res) => {
        adapter.log.info(`Daikin Device initialized ${err ? `with Error :${err.message}` : 'successfully'}`);
        if (!err) {
            setConnected(true);
            adapter.log.info(`Set polling Intervall to ${adapter.config.pollingInterval}s`);
            daikinDevice.setUpdate(adapter.config.pollingInterval * 1000, err => {
                storeDaikinData(err);
            });
            adapter.subscribeStates('control.*');
            adapter.subscribeStates('demandControl.*');
        }
        else {
            setConnected(false);
            adapter.log.info('Retry init in 60 seconds');
            setTimeout(main, 60000);
        }
    });
}

async function storeDaikinData(err) {
    let updated = 0;

    if (stopped) return;
    if (!err) {
        setConnected(true);
        if (!deviceName && daikinDevice.currentCommonBasicInfo && daikinDevice.currentCommonBasicInfo.name) {
            deviceName = `${daikinDevice.currentCommonBasicInfo.name} `;
        }

        const controlInfo = {
            ...daikinDevice.currentACControlInfo
        };
        const control = {};
        for (const fieldName in fieldDef.control) {
            if (fieldName in controlInfo) {
                control[fieldName] = controlInfo[fieldName];
                delete controlInfo[fieldName];
            }
        }
        if (controlInfo.specialMode !== undefined) {
            control.specialPowerful = false;
            control.specialEcono = false;
            control.specialStreamer = false;
            switch (controlInfo.specialMode) {
                case '':
                    break;
                case '2':
                    control.specialPowerful = true;
                    break;
                case '12':
                    control.specialEcono = true;
                    break;
                case '13':
                    control.specialStreamer = true;
                    break;
                case '2/13':
                    control.specialPowerful = true;
                    control.specialStreamer = true;
                    break;
                case '12/13':
                    control.specialEcono = true;
                    control.specialStreamer = true;
                    break;
            }
        }

        const basicInfo = {
            ...daikinDevice.currentCommonBasicInfo
        };
        if (basicInfo && basicInfo.power !== undefined) {
            delete basicInfo.power;
        }

        updated += await handleDaikinUpdate(basicInfo, 'deviceInfo');
        updated += await handleDaikinUpdate(daikinDevice.currentACModelInfo, 'modelInfo');
        updated += await handleDaikinUpdate(control, 'control');
        updated += await handleDaikinUpdate(controlInfo, 'controlInfo');
        updated += await handleDaikinUpdate(daikinDevice.currentACSensorInfo, 'sensorInfo');
        if (daikinDevice.currentACDemandControl) {
            updated += await handleDaikinUpdate(daikinDevice.currentACDemandControl, 'demandControl');
        }
        if (updated > 0) {
            adapter.log.info(`${updated} Values updated`);
        }
    }
    else {
        setConnected(false);
        adapter.log.error(`Error updating data: ${err.message}`);
    }
    if (updatedStates['control.lastResult'] === undefined) {
        try {
            await adapter.extendObjectAsync('control.lastResult', {
                type: 'state',
                common: {
                    name: 'control.lastResult',
                    type: 'string',
                    read: true,
                    write: false
                },
                native: {id: 'control.lastResult'}
            });
            updatedStates['control.lastResult'] = true;
        } catch (err) {
            adapter.log.error(`Error creating State: ${err.message}`);
        }
    }
    await adapter.setStateAsync('control.lastResult', {ack: true, val: (err ? err.message : 'OK')});
}

async function handleDaikinUpdate(data, channel) {
    if (stopped) return;
    adapter.log.debug(`HandleDaikinUpdate for ${channel} with ${JSON.stringify(data)}`);
    let updated = 0;
    if (!data) {
        adapter.log.info(`Data for channel ${channel} missing!`);
        return updated;
    }
    if (updatedStates[channel] === undefined) {
        adapter.log.debug(`Create Channel ${channel}`);
        try {
            await adapter.extendObjectAsync(channel, {
                type: 'channel',
                common: {
                    'name': deviceName + channel,
                    'role': channelDef[channel].role
                },
                native: {}
            });
        } catch(err) {
            adapter.log.error(`Error creating Channel: ${err.message}` );
        }
        updatedStates[channel] = {};
    }
    for (let fieldName in data) {
        if (stopped) return;
        if (typeof fieldName !== 'string') {
            fieldName = fieldName.toString();
        }
        let valid = true;
        //adapter.log.debug(JSON.stringify(fieldName));
        if (updatedStates[channel][fieldName] === undefined) {
            if (fieldDef[channel][fieldName]) {
                adapter.log.debug(`Create State ${channel}.${fieldName}`);
                var commonDef = fieldDef[channel][fieldName];
                commonDef.name = `${deviceName + channel}.${fieldName}`;
                try {
                    await adapter.extendObjectAsync(`${channel}.${fieldName}`, {
                        type: 'state',
                        common: commonDef,
                        native: {
                            id: `${channel}.${fieldName}`
                        }
                    });
                } catch (err) {
                    adapter.log.error(`Error creating State: ${err.message}`);
                }
            }
            else if (data[fieldName] === undefined) {
                continue;
            }
            else {
                valid = false;
                if (channel !== 'deviceInfo' && fieldName !== 'power') {
                    adapter.log.warn(`Unknown data field ${channel}.${fieldName}. Report to Developer!`);
                }
            }
        }
        if (data[fieldName] !== null && fieldDef[channel][fieldName] && typeof data[fieldName] !== fieldDef[channel][fieldName].type) {
            if (fieldDef[channel][fieldName].type === 'string') {
                if (data[fieldName] !== null && data[fieldName] !== undefined) {
                    data[fieldName] = data[fieldName].toString();
                } else {
                    data[fieldName] = null;
                }
            }
            else {
                adapter.log.debug(`Field type mismatch for ${fieldName}: val=${data[fieldName]} vs. ${fieldDef[channel][fieldName].type} - set null`);
                data[fieldName] = null;
            }
        }
        if (typeof data[fieldName] === 'number' && isNaN(data[fieldName])) data[fieldName] = null;
        adapter.log.debug(`Old value ${channel}.${fieldName}: old=${updatedStates[channel][fieldName]}, new=${data[fieldName]}`);
        if (valid && (updatedStates[channel][fieldName] === undefined || updatedStates[channel][fieldName] !== data[fieldName])) {
            adapter.log.debug(`Set State ${channel}.${fieldName}: ${data[fieldName]}`);
            await adapter.setStateAsync(`${channel}.${fieldName}`, {ack: true, val: data[fieldName]});
            updatedStates[channel][fieldName] = data[fieldName];
            updated++;
        }
    }
    return updated;
}

function processMessage(message) {
    if (!message) return;

    adapter.log.info(`Message received = ${JSON.stringify(message)}`);

    if (message.command === 'discover') {
        DaikinController.discover(5, result => {
            adapter.log.info(JSON.stringify(result));
            return adapter.sendTo(message.from, message.command, {devices: result}, message.callback);
        });
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
