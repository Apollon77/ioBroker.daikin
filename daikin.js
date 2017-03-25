/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';
/**
 *
 * Daikin adapter
 */
var path = require('path');
var utils = require(path.join(__dirname,'lib','utils')); // Get common adapter utils
var DaikinController = require('daikin-controller');
var daikinDevice;
var updatedStates = {};
var updateTimeout = null;

var Power = 'true:ON:false:OFF';
var Mode = '0:AUTO;1:AUTO1;2:DEHUMDID;3:COLD;4:HOT;6:FAN;7:AUTO2';
var FanRate = 'A:AUTO;B:SILENCE;3:LEVEL_1;4:LEVEL_2;5:LEVEL_3;6:LEVEL_4;7:LEVEL_5';
var FanDirection = '0:STOP;1:VERTICAL;2:HORIZONTAL;3:VERTICAL_AND_HORIZONTAL';

var channelDef = {
    'deviceInfo': {'role': 'info'},
    'control': {'role': 'thermo'},
    'controlInfo': {'role': 'info'},
    'modelInfo': {'role': 'info'},
    'sensorInfo': {'role': 'info'}
};
var fieldDef = {
    'deviceInfo': {
        'type':           {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'region':         {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'dst':            {'role': 'indicator', 'read': true, 'write': false, 'type': 'boolean'},
        'adapterVersion': {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        //'power':          {'role': '', 'read': true, 'write': false, 'type': 'boolean', 'altValues': Power},
        'location':       {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'name':           {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'icon':           {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'method':         {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'port':           {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'id':             {'role': 'text', 'read': true, 'write': false, 'type': 'string'}, // unit identifier
        'password':       {'role': 'text', 'read': true, 'write': false, 'type': 'string'}, // password
        'lpwFlag':        {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'pv':             {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpv':            {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpvMinor':       {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'led':            {'role': 'button', 'read': true, 'write': false, 'type': 'boolean'}, // status LED on or off
        'enSetzone':      {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'macAddress':     {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'adapterMode':    {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'error':          {'role': 'value', 'read': true, 'write': false, 'name': 'error', 'type': 'number'},		// 255
        'enHol':          {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'enGrp':          {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'groupName':      {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'adapterKind':    {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    },
    'control': {
        'power':             {'role': 'switch', 'read': true, 'write': true, 'type': 'boolean', 'states': Power},
    	'mode':              {'role': 'level', 'read': true, 'write': true, 'type': 'number', 'states': Mode, 'min': 0, 'max': 7},
    	'targetTemperature': {'role': 'level.temperature', 'read': true, 'write': true, 'type': 'number', 'altValues': {'M': 'M'}, 'min': 10, 'max': 41, 'unit': '°C'},
    	'targetHumidity':    {'role': 'level.humidity', 'read': true, 'write': true, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'min': 0, 'max': 50, 'unit': '%'},		// "AUTO" or number from 0..50
    	'fanRate':           {'role': 'text', 'read': true, 'write': true, 'type': 'string', 'states': FanRate},
    	'fanDirection':      {'role': 'level', 'read': true, 'write': true, 'type': 'number', 'states': FanDirection},
    },
    'controlInfo': {
    	// the following are returned, but not set-able
    	'adv':                    {'role': 'text', 'read': true, 'write': false, 'type': 'string'},			// ????

    	'targetTemperatureMode1': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},		// "M" or number 10..41
    	'targetTemperatureMode2': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},
    	'targetTemperatureMode3': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},
    	'targetTemperatureMode4': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},
    	'targetTemperatureMode5': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},
    	'targetTemperatureMode7': {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},

    	'targetHumidityMode1':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityMode2':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityMode3':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityMode4':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityMode5':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityMode7':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number
    	'targetHumidityModeH':    {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},		// AUTO or number

        'fanRateMode1':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanRateMode2':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanRateMode3':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanRateMode4':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanRateMode5':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode6':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
        'fanRateMode7':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanRateModeH':           {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},

        'fanDirectionMode1':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
    	'fanDirectionMode2':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
    	'fanDirectionMode3':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
    	'fanDirectionMode4':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
    	'fanDirectionMode5':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode6':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'fanDirectionMode7':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
    	'fanDirectionModeh':      {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},

    	'modeB':                  {'role': 'level', 'read': true, 'write': false, 'type': 'number', 'states': Mode},
    	'targetTemperatureB':     {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'altValues': {'M': 'M'}, 'unit': '°C'},
    	'targetHumidityB':        {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'altValues': {'AUTO': 'AUTO'}, 'unit': '%'},
        'fanRateB':               {'role': 'text', 'read': true, 'write': false, 'type': 'string', 'states': FanRate},
    	'fanDirectionB':          {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},

    	'error':                  {'role': 'value', 'read': true, 'write': false, 'type': 'number'}		// 255
    },
    'modelInfo': {
        'model':         {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'type':          {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'pv':            {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cpv':           {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'mid':           {'role': 'text', 'read': true, 'write': false, 'type': 'string'},
        'sFanDirection': {'role': 'value', 'read': true, 'write': false, 'type': 'number', 'states': FanDirection},
        'enScdltmr':     {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    },
    'sensorInfo': {
        'indoorTemperature':  {'role': 'value.temperature', 'read': true, 'write': false, 'type': 'number', 'unit': '°C'},
        'indoorHumidity':     {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '%'},
        'outdoorTemperature': {'role': 'value.humidity', 'read': true, 'write': false, 'type': 'number', 'unit': '°C'},
        'error':              {'role': 'value', 'read': true, 'write': false, 'type': 'number'},
        'cmpfreq':            {'role': 'value', 'read': true, 'write': false, 'type': 'number'}
    },
};


var adapter = utils.adapter('daikin');

adapter.on('ready', function (obj) {
    main();
});

adapter.on('message', function (msg) {
    processMessage(msg);
});

adapter.on('stateChange', function (id, state) {
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
});

adapter.on('unload', function (callback) {
    if (daikinDevice) daikinDevice.stopUpdate();

});

process.on('SIGINT', function () {
    if (daikinDevice) daikinDevice.stopUpdate();
});

process.on('uncaughtException', function (err) {
    adapter.log.warn('Exception: ' + err);
    if (daikinDevice) daikinDevice.stopUpdate();
});

function main() {
    var options = {};
    if (adapter.common.loglevel === 'debug') {
        options.logger = adapter.log.debug;
    }
    else if (adapter.common.loglevel === 'info') { //TODO: rausnehmen!
        options.logger = adapter.log.info;
    }
    if (!adapter.config.daikinIp) {
        throw Error('No IP set for Deikin Device, check your configuration!');
    }
    if (adapter.config.pollingInterval !== null && adapter.config.pollingInterval !== undefined && adapter.config.pollingInterval !== "") {
        adapter.config.pollingInterval = parseInt(adapter.config.pollingInterval, 10);
    }
    else adapter.config.pollingInterval = 300;

    daikinDevice = new DaikinController.DaikinAC(adapter.config.daikinIp, options, function (err, res) {
        adapter.log.info('Daikin Device initialized ' + (err?'with Error :' + err:'successfully'));
        if (!err) {
            adapter.log.info('Set polling Intervall to ' + adapter.config.pollingInterval + 's');
            daikinDevice.setUpdate(adapter.config.pollingInterval * 1000, function() {
                storeDaikinData();
            });
        }
    });
}

function storeDaikinData() {
    var updated = 0;
    updated += handleDaikinUpdate(daikinDevice.currentCommonBasicInfo, 'deviceInfo');
    updated += handleDaikinUpdate(daikinDevice.currentACModelInfo, 'modelInfo');
    updated += handleDaikinUpdate(daikinDevice.currentACControlInfo, 'control');
    updated += handleDaikinUpdate(daikinDevice.currentACControlInfo, 'controlInfo');
    updated += handleDaikinUpdate(daikinDevice.currentACSensorInfo, 'sensorInfo');
    adapter.log.info(updated + ' Values updated');
}

function handleDaikinUpdate(data, channel) {
    var updated = 0;
    if (!updatedStates[channel]) {
        adapter.log.debug('Create Channel ' + channel);
        adapter.setObjectNotExists(channel, {
            type: 'channel',
            common: {
                'name': channel,
                'role': channelDef[channel]
            },
            native: {}
        });
        updatedStates[channel] = {};
    }
    for (var fieldName in data) {
        var valid = true;
        if (!updatedStates[channel][fieldName]) {
            if (typeof fieldName !== 'string') {
                fieldName = fieldName.toString();
            }
            //adapter.log.debug(JSON.stringify(fieldName));
            if (fieldDef[channel][fieldName]) {
                adapter.log.debug('Create State ' + channel + '.' + fieldName);
                var commonDef = fieldDef[channel][fieldName];
                commonDef.name = channel + '.' + fieldName;
                adapter.setObjectNotExists(channel + '.' + fieldName, {
                    type: 'state',
                    common: commonDef,
                    native: {
                        id: channel + '.' + fieldName
                    }
                });
            }
            else {
                valid = false;
            }
            /*else {
                adapter.log.warn('Unknown data field ' + channel + '.' + fieldDef + '. Report to Developer!');
            }*/
        }
        adapter.log.debug('Old value "' + updatedStates[channel][fieldName] + '" vs. "' + data[fieldName] + '"');
        if (valid && (!updatedStates[channel][fieldName] || updatedStates[channel][fieldName] !== data[fieldName])) {
            adapter.log.debug('Set State ' + channel + '.' + fieldName + ': "' + data[fieldName] + '"');
            adapter.setState(channel + '.' + fieldName, {ack: true, val: data[fieldName]});
            updatedStates[channel][fieldName] = data[fieldName];
            updated++;
        }
    }
    return updated;
}

function processMessage(message) {
    if (!message) return;

    adapter.log.info('Message received = ' + JSON.stringify(message));

    if (message.command === 'discover') {
        DaikinController.discover(5, function(result) {
            adapter.log.info(JSON.stringify(result));
            return adapter.sendTo(message.from, message.command, {devices: result}, message.callback);
        });
    }
}
