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

/*
 * InspectFile.ts
 *
 * This script simply finds the first IBF file and outputs its contents to the
 * console.
 */
import * as fs from 'fs';
import { IBFRecord } from '../IBFRecord/IBFRecord';
import { LogRecordType, HistoryLogRecordType } from '../LogRecord/LogRecord';
import * as IBFRecordReader from '../IBFRecord/IBFRecordReader';
import * as LogRecordParser from '../LogRecord/LogRecordParser';

export function ibfFile(callback: (result: Error | string) => void) {
    fs.readdir(".", (err, files) => {
        if (err !== null) {
            callback(err);
        }

        let ibfFiles = files.filter(f => {
            return f.endsWith(".ibf");
        });

        if (ibfFiles.length == 0) {
            callback(Error('No IBF file found.'));
        } else {
            console.log("Proecssing " + ibfFiles[0]);
            callback(ibfFiles[0]);
        }
    });
}

export function inspectFile(result: Error | string) {
    if (typeof result !== "string") {
        console.error(result);
    } else {
        fs.readFile(result, (err, buffer) => {
            if (err != null) {
                console.log(err);
                return;
            }

            let record: IBFRecord;

            // TODO: add support for the file headers and profile entries -- skip them until then
            let recordCount = -18;

            while (true) {
                [record, buffer] = IBFRecordReader.readIBFRecord(buffer);
                if (record == null || buffer.length == 0) {
                    break;
                }
                recordCount++;
                if (recordCount >= 0) {
                    let [err, parsed] = LogRecordParser.parseLogRecord(record);
                    if (err) {
                        console.log(err);
                    } else {
                        let recordType;
                        if (typeof parsed["historyLogRecordType"] !== 'undefined') {
                            recordType = HistoryLogRecordType[parsed["historyLogRecordType"]];
                        } else {
                            recordType = LogRecordType[parsed.logType];
                        }
                        console.log(recordCount + ": " + recordType + JSON.stringify(parsed));
                    }
                }
            }
        });
    }
}

ibfFile(inspectFile);
