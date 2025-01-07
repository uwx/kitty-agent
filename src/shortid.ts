const S64_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function s64encode(i: number): string {
    let s = '';

    while (i) {
        const c = i % S64_CHAR.length;
        i = Math.floor(i / S64_CHAR.length);
        s = S64_CHAR.charAt(c) + s;
    }

    return s;
}

let lastTimestamp = 0;
const EPOCH = 1735689600000; // Wed, 01 Jan 2025 00:00:00 GMT, in Unix milliseconds

/**
 * Short rkey-compatible ID composed of 53-bit millisecond-precise monotonically increasing timestamp (see EPOCH) and
 * 10-bit random clock ID, serialized into the base64url alphabet.
 * 
 * Format: clock_id (10-bit integer encoded to base64url, padded to length 2 with 'A') || timestamp_millis (53-bit
 * integer encoded to base64url)
 */
// biome-ignore lint/complexity/noStaticOnlyClass: By design
export class ShortId {
    /**
     * Creates a ShortID based off provided timestamp and clockid, with no validation.
     */
    static createRaw(timestamp: number, clockid: number): string {
        return `${s64encode(clockid).padStart(2, S64_CHAR[0])}${s64encode(timestamp)}`;
    }

    /**
     * Creates a ShortID based off provided timestamp and clockid
     */
    static create(timestamp: number, clockid: number): string {
        if (timestamp < 0 || !Number.isSafeInteger(timestamp)) {
            throw new Error('invalid timestamp');
        }

        if (clockid < 0 || clockid > 1023) {
            throw new Error('invalid clockid');
        }

        return ShortId.createRaw(timestamp, clockid);
    }

    /**
     * Return a ShortID based on current time
     */
    static now(): string {
        const timestamp = Math.max(Date.now() - EPOCH, lastTimestamp);
        lastTimestamp = timestamp + 1;

        return ShortId.createRaw(timestamp, Math.floor(Math.random() * 1023));
    };

}
