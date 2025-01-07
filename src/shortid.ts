const S62_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function s62encode(i: number): string {
    let s = '';

    while (i) {
        const c = i % S62_CHAR.length;
        i = Math.floor(i / S62_CHAR.length);
        s = S62_CHAR.charAt(c) + s;
    }

    return s;
}

let lastTimestamp = 0;

// biome-ignore lint/complexity/noStaticOnlyClass: By design
export class ShortId {
    /**
     * Creates a ShortID based off provided timestamp and clockid, with no validation.
     */
    static createRaw(timestamp: number, clockid: number): string {
        return `${s62encode(clockid).padStart(2, 'A')}${s62encode(timestamp)}`;
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
        // we need these two aspects, which Date.now() doesn't provide:
        // - monotonically increasing time
        // - microsecond precision

        // while `performance.timeOrigin + performance.now()` could be used here, they
        // seem to have cross-browser differences, not sure on that yet.

        const timestamp = Math.max(Date.now(), lastTimestamp);
        lastTimestamp = timestamp + 1;

        return ShortId.createRaw(timestamp, Math.floor(Math.random() * 1023));
    };

}
