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
 * IBFRecord.ts
 *
 * This file contains the basic models for an IBFRecord, which holds the bytes for a single record.
 * It additionally contains utilities for consuming these bytes in various numerical formats, dates, versions, and strings.
 */

/* 
 * IBFRecord is a simple holder for the unprocessed bytes of a single IBF record from a file.
 */
export class IBFRecord {
    buffer: Buffer

    constructor(buffer: Buffer) {
        this.buffer = buffer;
    }

    byteReader(): IBFByteReader {
        return new IBFByteReader(this.buffer);
    }
}

/*
 * Version represents a typical major.minor.patch version where all components are numbers.
 */
export class Version {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;

    constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
}

/*
 * An IBFByteReader allows a parser to easily consume the bytes in an IBFRecord as more complex 
 * types in sequential order.
 */
export class IBFByteReader {
    private readonly buffer: Buffer
    private offset: number

    constructor(buffer: Buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }

    /* the number of bytes left in the IBFRecord that have not been consumed. */
    remaining(): number {
        return this.buffer.length - this.offset;
    }

    /* skips the specified number of bytes. */
    skip(n: number) {
        this.offset += n;
    }

    /* the next byte (int8) */
    nextInt8(): number {
        let value = this.buffer.readInt8(this.offset);
        this.offset += 1;
        return value;
    }

    /* the next unsigned short (uint16) in little-endian format */
    nextUInt16LE(): number {
        let value = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    /* the next unsigned short (uint16) in big-endian format */
    nextUInt16BE(): number {
        let value = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    /* the next signed short (int16) in little-endian format */
    nextInt16LE(): number {
        let value = this.buffer.readInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    /* the next signed short (int16) in big-endian format */
    nextInt16BE(): number {
        let value = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return value;
    }

    /* the next unsigned integer (uint32) in little-endian format */
    nextUInt32LE(): number {
        let value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    /* the next unsigned integer (uint32) in big-endian format */
    nextUInt32BE(): number {
        let value = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    /* the next signed integer (int32) in little-endian format */
    nextInt32LE(): number {
        let value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    /* the next signed integer (int32) in big-endian format */
    nextInt32BE(): number {
        let value = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    /* the next date (Y-m-d H:m:s), inferred to be in the local time zone */
    nextDate(): Date {
        if (this.remaining() < 7) {
            return null;
        }

        let day = this.nextInt8();
        let month = this.nextInt8();
        let year = this.nextUInt16LE();
        let seconds = this.nextInt8();
        let minutes = this.nextInt8();
        let hours = this.nextInt8();

        return new Date(year, month - 1, day, hours, minutes, seconds);
    }

    /* the next version, as major.minor.patch with numerical components */
    nextVersion(): Version {
        if (this.remaining() < 3) {
            return null;
        }

        let major = this.nextInt8();
        let minor = this.nextInt8();
        let patch = this.nextInt8();

        return new Version(major, minor, patch);
    }

    /* 
     * nextString reads a null-terminated string from a fixed-width field.
     *
     * Any bytes after the first null byte in the fixed-width field will be ignored.
     */
    nextString(fixedLength: number): string {
        let idx = this.offset;
        while (this.buffer[idx] != 0x00) {
            idx++;
        }
        let strBuffer = this.buffer.slice(this.offset, idx);
        this.offset += fixedLength;
        return strBuffer.toString('latin1');
    }
}
