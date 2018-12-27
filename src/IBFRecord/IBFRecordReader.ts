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

import { IBFRecord } from './IBFRecord';

/* 
 * Attempts to read a single IBFRecord from the start of the given buffer.
 *
 * Returns the IBFRecord and a slice of the buffer containing the unread bytes.
 * 
 * Returns [null, buffer] if there are insufficient bytes to read another IBFRecord.
 * 
 * Throws an Error if the checksum does not match the read data.
 */
export function readIBFRecord(buffer: Buffer): [IBFRecord, Buffer] {
    let remainingBytes = buffer.length;

    if (remainingBytes < 4) {
        return [null, buffer];
    }

    let recordSize = buffer.readUInt16BE(0);
    if (remainingBytes < recordSize + 2) {
        return [null, buffer];
    }

    let data = buffer.slice(2, recordSize);

    let checksum = new Int32Array(1);
    data.forEach(value => {
        checksum[0] += (value & 0xff);
    });

    let expectedChecksum = buffer.readUInt16BE(recordSize);

    if (checksum[0] != expectedChecksum) {
        let loggedData = [
            'expectedChecksum = ' + expectedChecksum,
            'actualChecksum = ' + checksum,
            'recordSize = ' + recordSize,
            'bytes = ' + data.toString('hex')
        ];
        throw Error('IBFIntegrityException: checksum(' + loggedData.join(", ") + ')');
    }

    return [new IBFRecord(data), buffer.slice(recordSize + 2, buffer.length)];
}
