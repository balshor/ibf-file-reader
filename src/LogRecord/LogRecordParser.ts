/*
 * Copyright 2018 Darren Lee <balshor@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR 
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { IBFRecord } from '../IBFRecord/IBFRecord';
import {
    ActivateLogRecord,
    AlarmLogRecord,
    AlarmType,
    BasalLogRecord,
    BloodGlucoseFlag,
    BloodGlucoseLogRecord,
    BolusLogRecord,
    CarbLogRecord,
    DateChangeLogRecord,
    HistoryLogRecord,
    HistoryLogRecordFlag,
    HistoryLogRecordType,
    LogRecord,
    LogRecordType,
    PumpAlarmDetails,
    RemoteHazardAlarmLogRecord,
    SuggestedCalculationLogRecord,
    TerminateBasalLogRecord,
    TerminateBolusLogRecord,
    TimeChangeLogRecord
} from './LogRecord';

export function parseLogRecord(ibfRecord: IBFRecord): [Error, LogRecord] {
    let it = ibfRecord.byteReader();

    if (it.remaining() < 18) {
        return [Error('Insufficient data: ' + it.remaining()), null];
    }

    let logType = it.nextInt8();

    if (logType != LogRecordType.HISTORY && logType != LogRecordType.PUMP_ALARM) {
        return [Error('Unknown log record type: ' + logType), null];
    }

    let logIndex = it.nextInt32BE();
    let recordSize = it.nextUInt16BE();
    let errorCode: number = it.nextUInt16BE();
    let timestamp = it.nextDate();

    it.skip(1);

    let secondsSincePowerUp = it.nextUInt32LE();

    switch (logType) {
        case LogRecordType.HISTORY:
            let historyLogRecordType = it.nextInt32LE();
            let foundRecordType = HistoryLogRecordType.values().find(value => value === historyLogRecordType);
            if (foundRecordType === undefined) {
                return [Error('Unknown history log record type: ' + historyLogRecordType), null];
            }

            let historyLogRecordFlagsValue = it.nextUInt16LE();
            let historyLogRecordFlags = HistoryLogRecordFlag.values().filter(flag =>
                (flag & historyLogRecordFlagsValue) != 0)

            it.skip(2);

            switch (historyLogRecordType) {
                case HistoryLogRecordType.BASAL_RATE: {
                    let basalRatePerHour = it.nextUInt32LE() / 100;
                    let durationInMinutes = it.nextUInt16LE();
                    let percent = it.nextUInt16LE() / 100;

                    return [null, new BasalLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        basalRatePerHour,
                        durationInMinutes,
                        percent
                    )];
                }
                case HistoryLogRecordType.BOLUS: {
                    let units = it.nextUInt32LE() / 100;
                    let extendedDurationMinutes = it.nextUInt16LE();
                    let calculationRecordOffset = it.nextUInt16LE();
                    let immediateDurationSeconds = it.nextUInt16LE();

                    return [null, new BolusLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        units,
                        extendedDurationMinutes,
                        calculationRecordOffset,
                        immediateDurationSeconds
                    )];
                }
                case HistoryLogRecordType.DATE_CHANGE: {
                    let newDate = it.nextDate();

                    return [null, new DateChangeLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        newDate
                    )];
                }
                case HistoryLogRecordType.TIME_CHANGE: {
                    let newTime = it.nextDate();

                    return [null, new TimeChangeLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        newTime
                    )];
                }
                case HistoryLogRecordType.SUGGESTED_CALC: {
                    let correctionDelivered = it.nextUInt32LE() / 100;
                    let carbBolusDelivered = it.nextUInt32LE() / 100;
                    let correctionProgrammed = it.nextUInt32LE() / 100;
                    let carbBolusProgrammed = it.nextUInt32LE() / 100;
                    let correctionSuggested = it.nextInt32LE() / 100;
                    let carbBolusSuggested = it.nextUInt32LE() / 100;
                    let correctionJob = it.nextUInt32LE();
                    let mealJob = it.nextUInt32LE();
                    let correctionFactorUsed = it.nextUInt16LE();
                    let currentBG = it.nextUInt16LE();
                    let targetBG = it.nextUInt16LE();
                    let correctionThresholdBG = it.nextUInt16LE();
                    let carbGrams = it.nextInt16LE();
                    let icRatioUsed = it.nextUInt16LE();

                    return [null, new SuggestedCalculationLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        correctionDelivered,
                        carbBolusDelivered,
                        correctionProgrammed,
                        carbBolusProgrammed,
                        correctionSuggested,
                        carbBolusSuggested,
                        correctionJob,
                        mealJob,
                        correctionFactorUsed,
                        currentBG,
                        targetBG,
                        correctionThresholdBG,
                        carbGrams,
                        icRatioUsed
                    )];
                }
                case HistoryLogRecordType.REMOTE_HAZARD_ALARM: {
                    let alarmTime = it.nextDate();
                    it.skip(1);
                    let alarmType = it.nextUInt16LE();
                    let fileNumber = it.nextUInt16LE();
                    let lineNumber = it.nextUInt16LE();
                    let alarmErrorCode = it.nextUInt16LE();

                    return [null, new RemoteHazardAlarmLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        alarmTime,
                        alarmType,
                        fileNumber,
                        lineNumber,
                        alarmErrorCode
                    )];
                }
                case HistoryLogRecordType.ALARM: {
                    let alarmTime = it.nextDate();
                    it.skip(1);
                    let alarmType = it.nextUInt16LE();
                    let fileNumber = it.nextUInt16LE();
                    let lineNumber = it.nextUInt16LE();
                    let alarmErrorCode = it.nextUInt16LE();

                    return [null, new AlarmLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        alarmTime,
                        alarmType,
                        fileNumber,
                        lineNumber,
                        alarmErrorCode
                    )];
                }
                case HistoryLogRecordType.BLOOD_GLUCOSE: {
                    let bgErrorCode = it.nextUInt32LE();
                    let bgReading = it.nextUInt16LE();
                    let userTag1 = it.nextString(24);
                    let userTag2 = it.nextString(24);
                    let bgFlagsValue = it.nextInt8();

                    return [null, new BloodGlucoseLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        bgErrorCode,
                        bgReading,
                        userTag1,
                        userTag2,
                        BloodGlucoseFlag.fromBitSet(bgFlagsValue)
                    )];
                }
                case HistoryLogRecordType.CARB: {
                    let carbs = it.nextUInt16LE();
                    let wasPreset = it.nextInt8();
                    let presetType = it.nextInt8();

                    return [null, new CarbLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        carbs,
                        wasPreset,
                        presetType
                    )];
                }
                case HistoryLogRecordType.TERMINATE_BOLUS: {
                    let insulinLeft = it.nextUInt32LE() / 100;
                    let timeLeftMinutes = it.nextUInt16LE();

                    return [null, new TerminateBolusLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        insulinLeft,
                        timeLeftMinutes
                    )];
                }
                case HistoryLogRecordType.TERMINATE_BASAL: {
                    let timeLeftMinutes = it.nextUInt16LE();

                    return [null, new TerminateBasalLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        timeLeftMinutes
                    )];
                }
                case HistoryLogRecordType.ACTIVATE: {
                    let lotNumber = it.nextUInt16LE();
                    let serialNumber = it.nextUInt16LE();
                    let podVersion = it.nextVersion();
                    let interlockVersion = it.nextVersion();

                    return [null, new ActivateLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags),
                        lotNumber,
                        serialNumber,
                        podVersion,
                        interlockVersion
                    )];
                }
                default:
                    return [null, new HistoryLogRecord(
                        logType,
                        logIndex,
                        timestamp,
                        secondsSincePowerUp,
                        errorCode,
                        historyLogRecordType,
                        new Set(historyLogRecordFlags)
                    )];

            }
        case LogRecordType.PUMP_ALARM:
            let alarmTimestamp = it.nextDate();
            it.skip(1);
            let alarmTypeID = it.nextInt8();
            it.skip(1);
            let alarmErrorCode = it.nextInt8();
            let lotNumber = it.nextUInt32LE();
            let seqNumber = it.nextUInt32LE();
            let processorVersion = it.nextVersion();
            let interlockVersion = it.nextVersion();

            return [null, new PumpAlarmDetails(
                logType,
                logIndex,
                timestamp,
                secondsSincePowerUp,
                errorCode,
                alarmTimestamp,
                AlarmType.forID(alarmTypeID),
                alarmErrorCode,
                lotNumber,
                seqNumber,
                processorVersion,
                interlockVersion
            )];
        default:
            throw Error('Assertion failure: should be unreachable due to earlier log record type check.');
    }
}
