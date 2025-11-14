/**
 * Daikin adapter
 */

import * as utils from '@iobroker/adapter-core';
import * as DaikinController from 'daikin-controller';

interface DaikinAdapterConfig extends ioBroker.AdapterConfig {
    daikinIp: string;
    pollingInterval: number;
    useGetToPost: boolean;
}

const Mode = { 0: 'AUTO', 1: 'AUTO1', 2: 'DEHUMID', 3: 'COLD', 4: 'HOT', 6: 'FAN', 7: 'AUTO2' };
const FanRate = {
    A: 'AUTO',
    B: 'SILENCE',
    3: 'LEVEL_1',
    4: 'LEVEL_2',
    5: 'LEVEL_3',
    6: 'LEVEL_4',
    7: 'LEVEL_5',
};
const FanDirection = { 0: 'STOP', 1: 'VERTICAL', 2: 'HORIZONTAL', 3: 'VERTICAL_AND_HORIZONTAL' };
const SpecialMode = {
    '': 'NONE',
    2: 'POWERFUL',
    12: 'ECONO',
    13: 'STREAMER',
    '2/13': 'POWERFUL/STREAMER',
    '12/13': 'ECONO/STREAMER',
};

const DemandControlType = { 0: 'UNSUPPORTED', 1: 'SUPPORTED' };
const DemandControlMode = { 0: 'MANUAL', 1: 'TIMER', 2: 'AUTO' };

const channelDef = {
    deviceInfo: { role: 'info' },
    control: { role: 'thermo' },
    controlInfo: { role: 'info' },
    demandControl: { role: 'info' },
    modelInfo: { role: 'info' },
    sensorInfo: { role: 'info' },
};

const fieldDef: Record<string, Record<string, any>> = {
    deviceInfo: {
        type: { role: 'text', read: true, write: false, type: 'string' },
        region: { role: 'text', read: true, write: false, type: 'string' },
        dst: { role: 'indicator', read: true, write: false, type: 'boolean' },
        adapterVersion: { role: 'text', read: true, write: false, type: 'string' },
        location: { role: 'value', read: true, write: false, type: 'number' },
        name: { role: 'text', read: true, write: false, type: 'string' },
        icon: { role: 'value', read: true, write: false, type: 'number' },
        method: { role: 'text', read: true, write: false, type: 'string' },
        port: { role: 'value', read: true, write: false, type: 'number' },
        id: { role: 'text', read: true, write: false, type: 'string' },
        password: { role: 'text', read: true, write: false, type: 'string' },
        lpwFlag: { role: 'value', read: true, write: false, type: 'number' },
        pv: { role: 'value', read: true, write: false, type: 'number' },
        cpv: { role: 'value', read: true, write: false, type: 'number' },
        cpvMinor: { role: 'value', read: true, write: false, type: 'number' },
        led: { role: 'button', read: true, write: false, type: 'boolean' },
        enSetzone: { role: 'value', read: true, write: false, type: 'number' },
        macAddress: { role: 'text', read: true, write: false, type: 'string' },
        adapterMode: { role: 'text', read: true, write: false, type: 'string' },
        error: { role: 'value', read: true, write: false, name: 'error', type: 'number' },
        enHol: { role: 'value', read: true, write: false, type: 'number' },
        enGroup: { role: 'value', read: true, write: false, type: 'number' },
        groupName: { role: 'text', read: true, write: false, type: 'string' },
        adapterKind: { role: 'value', read: true, write: false, type: 'number' },
    },
    control: {
        power: { role: 'switch', read: true, write: true, type: 'boolean' },
        mode: { role: 'level', read: true, write: true, type: 'number', states: Mode, min: 0, max: 7 },
        targetTemperature: {
            role: 'level.temperature',
            read: true,
            write: true,
            type: 'number',
            min: 10,
            max: 41,
            unit: '°C',
        },
        targetHumidity: {
            role: 'level.humidity',
            read: true,
            write: true,
            type: 'number',
            min: 0,
            max: 50,
            unit: '%',
        },
        fanRate: { role: 'text', read: true, write: true, type: 'string', states: FanRate },
        fanDirection: { role: 'level', read: true, write: true, type: 'number', states: FanDirection },
        specialPowerful: { role: 'switch.boost', read: true, write: true, type: 'boolean' },
        specialEcono: { role: 'switch', read: true, write: true, type: 'boolean' },
        specialStreamer: { role: 'switch', read: true, write: true, type: 'boolean' },
    },
    controlInfo: {
        specialMode: { role: 'text', read: true, write: false, type: 'string', states: SpecialMode },

        targetTemperatureMode1: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetTemperatureMode2: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetTemperatureMode3: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetTemperatureMode4: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetTemperatureMode5: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetTemperatureMode7: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },

        targetHumidityMode1: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityMode2: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityMode3: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityMode4: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityMode5: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityMode7: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        targetHumidityModeH: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },

        fanRateMode1: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode2: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode3: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode4: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode5: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode6: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateMode7: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanRateModeH: { role: 'text', read: true, write: false, type: 'string', states: FanRate },

        fanDirectionMode1: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode2: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode3: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode4: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode5: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode6: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionMode7: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        fanDirectionModeH: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },

        modeB: { role: 'level', read: true, write: false, type: 'number', states: Mode },
        targetTemperatureB: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        targetHumidityB: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        fanRateB: { role: 'text', read: true, write: false, type: 'string', states: FanRate },
        fanDirectionB: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },

        error: { role: 'value', read: true, write: false, type: 'number' },
    },
    demandControl: {
        enabled: { role: 'switch', read: true, write: false, type: 'boolean' },
        type: { role: 'level', read: true, write: false, type: 'number', states: DemandControlType },
        mode: { role: 'level', read: true, write: false, type: 'number', states: DemandControlMode },
        maxPower: {
            role: 'level.power',
            read: true,
            write: true,
            type: 'number',
            min: 40,
            max: 100,
            unit: '%',
        },
    },
    modelInfo: {
        model: { role: 'text', read: true, write: false, type: 'string' },
        type: { role: 'text', read: true, write: false, type: 'string' },
        pv: { role: 'value', read: true, write: false, type: 'number' },
        cpv: { role: 'value', read: true, write: false, type: 'number' },
        mid: { role: 'text', read: true, write: false, type: 'string' },
        sFanDirection: { role: 'value', read: true, write: false, type: 'number', states: FanDirection },
        enScdltmr: { role: 'value', read: true, write: false, type: 'number' },
    },
    sensorInfo: {
        indoorTemperature: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        indoorHumidity: { role: 'value.humidity', read: true, write: false, type: 'number', unit: '%' },
        outdoorTemperature: {
            role: 'value.temperature',
            read: true,
            write: false,
            type: 'number',
            unit: '°C',
        },
        error: { role: 'value', read: true, write: false, type: 'number' },
        cmpfreq: { role: 'value', read: true, write: false, type: 'number' },
    },
};

class DaikinAdapter extends utils.Adapter {
    #daikinDevice: any;
    #deviceName = '';
    #changedStates: Record<string, any> = {};
    #updatedStates: Record<string, any> = {};
    #changeTimeout: NodeJS.Timeout | null = null;
    #changeRunning = false;
    #stopped = false;
    #connected: boolean | null = null;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'daikin',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady(): Promise<void> {
        await this.extendObjectAsync(this.namespace, {
            common: {
                statusStates: {
                    onlineId: `${this.namespace}.info.connection`,
                },
            },
        });
        this.main();
    }

    onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (!state || state.ack !== false || state.val === null) {
            return;
        }
        this.log.debug(`stateChange ${id} ${JSON.stringify(state)}`);
        const realNamespace = `${this.namespace}.control.`;
        const realNamespace2 = `${this.namespace}.demandControl.`;

        const stateId = id.startsWith(realNamespace)
            ? id.substring(realNamespace.length)
            : id.substring(realNamespace2.length);
        this.#changedStates[stateId] = state.val;
        if (this.#changeTimeout) {
            this.log.debug('Clear change timeout');
            clearTimeout(this.#changeTimeout);
            this.#changeTimeout = null;
        }
        this.#changeTimeout = setTimeout(() => this.changeStates(), 1000);
    }

    onMessage(msg: ioBroker.Message): void {
        this.processMessage(msg);
    }

    onUnload(callback: () => void): void {
        this.#stopped = true;
        if (this.#daikinDevice) {
            this.log.debug('Stopping update timeout');
            this.#daikinDevice.stopUpdate();
        }
        if (this.#changeTimeout) {
            this.log.debug('Clear change timeout');
            clearTimeout(this.#changeTimeout);
            this.#changeTimeout = null;
        }
        this.setConnected(false);
        callback();
    }

    changeStates(): void {
        if (this.#changeRunning) {
            this.log.info('postpone state changes because last change not finished');
            this.#changeTimeout = setTimeout(() => this.changeStates(), 1000);
            return;
        }
        this.#changeTimeout = null;
        this.#changeRunning = true;
        const changed = this.#changedStates;
        this.#changedStates = {};

        this.log.debug(`Send ${Object.keys(changed).length} changes: ${JSON.stringify(changed)}`);
        if (changed.mode !== undefined) {
            if (Object.keys(changed).length === 1) {
                this.log.debug('we changed mode only');
                if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== undefined &&
                    this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== null
                ) {
                    changed.targetTemperature =
                        this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`];
                    this.log.debug(`changed targetTemperature to ${changed.targetTemperature}`);
                } else if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.targetTemperatureMode1 !== undefined &&
                    this.#daikinDevice.currentACControlInfo.targetTemperatureMode1 !== null
                ) {
                    changed.targetTemperature = this.#daikinDevice.currentACControlInfo.targetTemperatureMode1;
                    this.log.debug(`changed targetTemperature to Mode 1:${changed.targetTemperature}`);
                } else {
                    changed.targetTemperature = 23;
                    this.log.debug('changed targetTemperature to fixed 23');
                }
                if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== undefined &&
                    this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== null
                ) {
                    changed.targetHumidity =
                        this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`];
                    this.log.debug(`changed targetHumidity to ${changed.targetHumidity}`);
                } else if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.targetHumidityMode1 !== undefined &&
                    this.#daikinDevice.currentACControlInfo.targetHumidityMode1 !== null
                ) {
                    changed.targetHumidity = this.#daikinDevice.currentACControlInfo.targetHumidityMode1;
                    this.log.debug(`changed targetHumidity to Mode 1: ${changed.targetHumidity}`);
                } else {
                    changed.targetHumidity = 0;
                    this.log.debug('changed targetHumidity to fixed 0');
                }
                if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`] !== undefined &&
                    this.#daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`] !== null
                ) {
                    changed.fanRate = this.#daikinDevice.currentACControlInfo[`fanRateMode${changed.mode}`];
                    this.log.debug(`changed fanRate to ${changed.fanRate}`);
                } else if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.fanRateMode1 !== undefined &&
                    this.#daikinDevice.currentACControlInfo.fanRateMode1 !== null
                ) {
                    changed.fanRate = this.#daikinDevice.currentACControlInfo.fanRateMode1;
                    this.log.debug(`changed fanRate to Mode 1: ${changed.fanRate}`);
                }
                if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`] !== undefined &&
                    this.#daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`] !== null
                ) {
                    changed.fanDirection = this.#daikinDevice.currentACControlInfo[`fanDirectionMode${changed.mode}`];
                    this.log.debug(`changed fanDirection to ${changed.fanDirection}`);
                } else if (
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.fanDirectionMode1 !== undefined &&
                    this.#daikinDevice.currentACControlInfo.fanDirectionMode1 !== null
                ) {
                    changed.fanDirection = this.#daikinDevice.currentACControlInfo.fanDirectionMode1;
                    this.log.debug(`changed fanDirection to Mode 1: ${changed.fanDirection}`);
                }
            } else {
                this.log.debug('we changed mode and other field');
                if (
                    changed.targetTemperature === undefined &&
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.targetTemperature === null
                ) {
                    if (
                        this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== undefined &&
                        this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`] !== null
                    ) {
                        changed.targetTemperature =
                            this.#daikinDevice.currentACControlInfo[`targetTemperatureMode${changed.mode}`];
                        this.log.debug(`changed targetTemperature to ${changed.targetTemperature}`);
                    } else if (
                        this.#daikinDevice.currentACControlInfo.targetTemperatureMode1 !== undefined &&
                        this.#daikinDevice.currentACControlInfo.targetTemperatureMode1 !== null
                    ) {
                        changed.targetTemperature = this.#daikinDevice.currentACControlInfo.targetTemperatureMode1;
                        this.log.debug(`changed targetTemperature to Mode 1: ${changed.targetTemperature}`);
                    } else {
                        changed.targetTemperature = 23;
                        this.log.debug('changed targetTemperature to fixed 23');
                    }
                }
                if (
                    changed.targetHumidity === undefined &&
                    this.#daikinDevice.currentACControlInfo &&
                    this.#daikinDevice.currentACControlInfo.targetHumidity === null
                ) {
                    if (
                        this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== undefined &&
                        this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`] !== null
                    ) {
                        changed.targetHumidity =
                            this.#daikinDevice.currentACControlInfo[`targetHumidityMode${changed.mode}`];
                        this.log.debug(`changed targetHumidity to ${changed.targetHumidity}`);
                    } else if (
                        this.#daikinDevice.currentACControlInfo.targetHumidityMode1 !== undefined &&
                        this.#daikinDevice.currentACControlInfo.targetHumidityMode1 !== null
                    ) {
                        changed.targetHumidity = this.#daikinDevice.currentACControlInfo.targetHumidityMode1;
                        this.log.debug(`changed targetHumidity to Mode 1: ${changed.targetHumidity}`);
                    } else {
                        changed.targetHumidity = 0;
                        this.log.debug('changed targetHumidity to fixed 0');
                    }
                }
            }
        }
        if (changed.maxPower !== undefined) {
            this.#daikinDevice.setACDemandControl({ maxPower: changed.maxPower }, (err: any, response: any) => {
                this.log.debug(`changed maxPower to ${changed.maxPower}, response ${JSON.stringify(response)}`);
                if (err) {
                    this.log.error(`change values failed: ${err.message}`);
                }
                delete changed.maxPower;
                this.setSpecialMode(changed);
            });
            return;
        }
        this.setSpecialMode(changed);
    }

    setConnected(isConnected: boolean): void {
        if (this.#connected !== isConnected) {
            this.#connected = isConnected;
            void this.setState('info.connection', isConnected, true, err => {
                if (err) {
                    this.log.error(`Can not update connected state: ${err}`);
                } else {
                    this.log.debug(`connected set to ${isConnected}`);
                }
            });
        }
    }

    setSpecialMode(changed: Record<string, any>): void {
        if (changed.specialPowerful !== undefined) {
            this.#daikinDevice.setACSpecialMode(
                { state: changed.specialPowerful ? '1' : '0', kind: DaikinController.SpecialModeKind.POWERFUL },
                () => {
                    delete changed.specialPowerful;
                    if (this.#updatedStates.control) {
                        this.#updatedStates.control.specialPowerful = '';
                    }
                    this.setSpecialMode(changed);
                },
            );
            return;
        }
        if (changed.specialEcono !== undefined) {
            this.#daikinDevice.setACSpecialMode(
                { state: changed.specialEcono ? '1' : '0', kind: DaikinController.SpecialModeKind.ECONO },
                () => {
                    delete changed.specialEcono;
                    if (this.#updatedStates.control) {
                        this.#updatedStates.control.specialEcono = '';
                    }
                    this.setSpecialMode(changed);
                },
            );
            return;
        }
        if (changed.specialStreamer !== undefined) {
            this.#daikinDevice.setACSpecialMode(
                { state: changed.specialStreamer ? '1' : '0', kind: DaikinController.SpecialModeKind.STREAMER },
                () => {
                    delete changed.specialStreamer;
                    if (this.#updatedStates.control) {
                        this.#updatedStates.control.specialStreamer = '';
                    }
                    this.setSpecialMode(changed);
                },
            );
            return;
        }

        if (Object.keys(changed).length > 0) {
            this.setControlInfo(changed);
        } else {
            this.#changeRunning = false;
            this.#daikinDevice.updateData();
        }
    }

    setControlInfo(changed: Record<string, any>): void {
        this.#daikinDevice.setACControlInfo(changed, (err: any, response: any) => {
            if (this.#updatedStates.control) {
                this.log.debug(`change values: ${JSON.stringify(changed)} to ${JSON.stringify(response)}`);
                if (err) {
                    this.log.error(`change values failed: ${err.message}`);
                }
                for (const fieldName in changed) {
                    this.#updatedStates.control[fieldName] = '';
                    this.log.debug(`reset ${fieldName}`);
                }
            }
            this.#changeRunning = false;
            void this.storeDaikinData(err);
        });
    }

    main(): void {
        this.setConnected(false);
        const options: any = {};
        if (this.log.level === 'debug') {
            options.logger = this.log.debug.bind(this.log);
        }
        if (!(this.config as DaikinAdapterConfig).daikinIp) {
            this.log.error('No IP set for Daikin Device, check your configuration!');
            typeof this.terminate === 'function' ? this.terminate(11) : process.exit(11);
            return;
        }
        let pollingInterval = (this.config as DaikinAdapterConfig).pollingInterval;
        if (pollingInterval !== null && pollingInterval !== undefined && pollingInterval !== 0) {
            pollingInterval = parseInt(String(pollingInterval), 10);
        } else {
            pollingInterval = 300;
        }
        if ((this.config as DaikinAdapterConfig).useGetToPost) {
            options.useGetToPost = true;
        }

        this.#daikinDevice = new DaikinController.DaikinAC(
            (this.config as DaikinAdapterConfig).daikinIp,
            options,
            (err: any) => {
                this.log.info(`Daikin Device initialized ${err ? `with Error :${err.message}` : 'successfully'}`);
                if (!err) {
                    this.setConnected(true);
                    this.log.info(`Set polling Intervall to ${pollingInterval}s`);
                    this.#daikinDevice.setUpdate(pollingInterval * 1000, (err: any) => {
                        void this.storeDaikinData(err);
                    });
                    this.subscribeStates('control.*');
                    this.subscribeStates('demandControl.*');
                } else {
                    this.setConnected(false);
                    this.log.info('Retry init in 60 seconds');
                    setTimeout(() => this.main(), 60000);
                }
            },
        );
    }

    async storeDaikinData(err: any): Promise<void> {
        if (this.#stopped) {
            return;
        }
        if (!err) {
            this.setConnected(true);
            if (
                !this.#deviceName &&
                this.#daikinDevice.currentCommonBasicInfo &&
                this.#daikinDevice.currentCommonBasicInfo.name
            ) {
                this.#deviceName = `${this.#daikinDevice.currentCommonBasicInfo.name} `;
            }

            const controlInfo = {
                ...this.#daikinDevice.currentACControlInfo,
            };
            const control: Record<string, any> = {};
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
                ...this.#daikinDevice.currentCommonBasicInfo,
            };
            if (basicInfo && basicInfo.power !== undefined) {
                delete basicInfo.power;
            }

            const updated: Record<string, number> = {};
            updated.deviceInfo = await this.handleDaikinUpdate(basicInfo, 'deviceInfo');
            updated.modelInfo = await this.handleDaikinUpdate(this.#daikinDevice.currentACModelInfo, 'modelInfo');
            updated.control = await this.handleDaikinUpdate(control, 'control');
            updated.controlInfo = await this.handleDaikinUpdate(controlInfo, 'controlInfo');
            updated.sensorInfo = await this.handleDaikinUpdate(this.#daikinDevice.currentACSensorInfo, 'sensorInfo');
            if (this.#daikinDevice.currentACDemandControl) {
                updated.demandControl = await this.handleDaikinUpdate(
                    this.#daikinDevice.currentACDemandControl,
                    'demandControl',
                );
            }
            const updatedTotal = Object.values(updated).reduce((sum, num) => {
                return sum + num;
            }, 0);
            if (updatedTotal > 0) {
                this.log.info(`${updatedTotal} Values updated: ${JSON.stringify(updated)}`);
            }
        } else {
            this.setConnected(false);
            this.log.error(`Error updating data: ${err.message}`);
        }
        if (this.#updatedStates['control.lastResult'] === undefined) {
            try {
                await this.extendObjectAsync('control.lastResult', {
                    type: 'state',
                    common: {
                        name: 'control.lastResult',
                        type: 'string',
                        read: true,
                        write: false,
                    },
                    native: { id: 'control.lastResult' },
                });
                this.#updatedStates['control.lastResult'] = true;
            } catch (err: any) {
                this.log.error(`Error creating State: ${err.message}`);
            }
        }
        await this.setStateAsync('control.lastResult', { ack: true, val: err ? err.message : 'OK' });
    }

    async handleDaikinUpdate(data: any, channel: string): Promise<number> {
        if (this.#stopped) {
            return 0;
        }
        this.log.debug(`HandleDaikinUpdate for ${channel} with ${JSON.stringify(data)}`);
        let updated = 0;
        if (!data) {
            this.log.info(`Data for channel ${channel} missing!`);
            return updated;
        }
        if (this.#updatedStates[channel] === undefined) {
            this.log.debug(`Create Channel ${channel}`);
            try {
                await this.extendObjectAsync(channel, {
                    type: 'channel',
                    common: {
                        name: this.#deviceName + channel,
                        role: (channelDef as any)[channel].role,
                    },
                    native: {},
                });
            } catch (err: any) {
                this.log.error(`Error creating Channel: ${err.message}`);
            }
            this.#updatedStates[channel] = {};
        }
        for (const fieldNameKey in data) {
            if (this.#stopped) {
                return updated;
            }
            let fieldName: string = fieldNameKey;
            if (typeof fieldName !== 'string') {
                fieldName = String(fieldName);
            }
            let valid = true;
            if (this.#updatedStates[channel][fieldName] === undefined) {
                if (fieldDef[channel][fieldName]) {
                    this.log.debug(`Create State ${channel}.${fieldName}`);
                    const commonDef = fieldDef[channel][fieldName];
                    commonDef.name = `${this.#deviceName + channel}.${fieldName}`;
                    try {
                        await this.extendObjectAsync(`${channel}.${fieldName}`, {
                            type: 'state',
                            common: commonDef,
                            native: {
                                id: `${channel}.${fieldName}`,
                            },
                        });
                    } catch (err: any) {
                        this.log.error(`Error creating State: ${err.message}`);
                    }
                } else if (data[fieldName] === undefined) {
                    continue;
                } else {
                    valid = false;
                    if (channel !== 'deviceInfo' && fieldName !== 'power') {
                        this.log.warn(`Unknown data field ${channel}.${fieldName}. Report to Developer!`);
                    }
                }
            }
            if (
                data[fieldName] !== null &&
                fieldDef[channel][fieldName] &&
                typeof data[fieldName] !== fieldDef[channel][fieldName].type
            ) {
                if (fieldDef[channel][fieldName].type === 'string') {
                    if (data[fieldName] !== null && data[fieldName] !== undefined) {
                        data[fieldName] = data[fieldName].toString();
                    } else {
                        data[fieldName] = null;
                    }
                } else {
                    this.log.debug(
                        `Field type mismatch for ${fieldName}: val=${data[fieldName]} vs. ${fieldDef[channel][fieldName].type} - set null`,
                    );
                    data[fieldName] = null;
                }
            }
            if (typeof data[fieldName] === 'number' && isNaN(data[fieldName])) {
                data[fieldName] = null;
            }
            this.log.debug(
                `Old value ${channel}.${fieldName}: old=${this.#updatedStates[channel][fieldName]}, new=${data[fieldName]}`,
            );
            if (
                valid &&
                (this.#updatedStates[channel][fieldName] === undefined ||
                    this.#updatedStates[channel][fieldName] !== data[fieldName])
            ) {
                this.log.debug(`Set State ${channel}.${fieldName}: ${data[fieldName]}`);
                await this.setStateAsync(`${channel}.${fieldName}`, { ack: true, val: data[fieldName] });
                this.#updatedStates[channel][fieldName] = data[fieldName];
                updated++;
            }
        }
        return updated;
    }

    processMessage(message: ioBroker.Message): void {
        if (!message) {
            return;
        }

        this.log.info(`Message received = ${JSON.stringify(message)}`);

        if (message.command === 'discover') {
            DaikinController.discover(5, (result: any) => {
                this.log.info(JSON.stringify(result));
                this.sendTo(message.from, message.command, { devices: result }, message.callback);
            });
        }
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new DaikinAdapter(options);
} else {
    (() => new DaikinAdapter())();
}
