const S67_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-_:~';

function s67encode(i: number): string {
    let s = '';

    while (i) {
        const c = i % S67_CHAR.length;
        i = Math.floor(i / S67_CHAR.length);
        s = S67_CHAR.charAt(c) + s;
    }

    return s;
}

function s67decode(s: string): number {
    let i = 0;

    for (let j = 0; j < s.length; j++) {
        i = i * S67_CHAR.length + S67_CHAR.indexOf(s[j]);
    }

    return i;
}

let lastTimestamp = 0;
const EPOCH = 1771196391050; // Sun, Feb 15 2026 22:59:48 GMT, in Unix milliseconds

type ShortIdString<Epoch extends number = typeof EPOCH> = string & { __epoch: Epoch };

/**
 * Short rkey-compatible ID composed of 53-bit millisecond-precise monotonically increasing timestamp
 * (customizable epoch) and 10-bit random clock ID, serialized into a 67-character, ATProto record key
 * compatible alphabet.
 *
 * Format: clock_id (10-bit integer encoded to s67, padded to length 2 with 'A') || timestamp_millis (53-bit
 * integer encoded to s67, variable length)
 */
// biome-ignore lint/complexity/noStaticOnlyClass: By design
export class ShortId2 {
    /**
     * Creates a ShortID based off provided timestamp and clockid, with no validation.
     */
    static createRaw(timestamp: number, clockid: number): string {
        return `${s67encode(clockid).padStart(2, S67_CHAR[0])}${s67encode(timestamp)}`;
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

        return ShortId2.createRaw(timestamp, clockid);
    }

    /**
     * Return a ShortID based on current time
     */
    static now<Epoch extends number>(epoch: Epoch): ShortIdString<Epoch>;
    static now(): ShortIdString<typeof EPOCH>;
    static now<Epoch extends number = typeof EPOCH>(epoch: Epoch = EPOCH as Epoch): ShortIdString<Epoch> {
        const timestamp = Math.max(Date.now() - epoch, lastTimestamp);
        lastTimestamp = timestamp + 1;

        return ShortId2.createRaw(timestamp, Math.floor(Math.random() * 1023)) as ShortIdString<Epoch>;
    };

    /**
     * Get the Date corresponding to the timestamp encoded in a ShortId, using the provided epoch (or default EPOCH)
     * @param shortId The ShortId
     * @param epoch The epoch to use for decoding the timestamp, defaults to EPOCH
     */
    static getDate<Epoch extends number = typeof EPOCH>(shortId: ShortIdString<Epoch>, epoch: Epoch): Date;
    static getDate(shortId: ShortIdString<typeof EPOCH>): Date;
    static getDate<Epoch extends number = typeof EPOCH>(shortId: ShortIdString<Epoch>, epoch: Epoch = EPOCH as Epoch): Date {
        const timestampPart = shortId.slice(2);
        const timestamp = s67decode(timestampPart);
        return new Date(timestamp + epoch);
    }
}
