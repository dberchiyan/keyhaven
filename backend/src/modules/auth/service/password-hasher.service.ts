import { randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!#%+-=?@';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;
const TEMPORARY_LENGTH = 16;
const DUMMY_SECRET_BYTES = 32;

const pick = (alphabet: string): string => alphabet.charAt(randomInt(alphabet.length));

const ARGON2_MEMORY_KIB = 19_456;

const HASH_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_KIB,
    timeCost: 2,
    parallelism: 1,
} as const;

/** AUTH-4: the one place passwords are hashed (argon2id) and verified. */
@Injectable()
export class PasswordHasher {
    private readonly dummyHash: Promise<string> = argon2.hash(
        randomBytes(DUMMY_SECRET_BYTES).toString('hex'),
        HASH_OPTIONS,
    );

    hash(password: string): Promise<string> {
        return argon2.hash(password, HASH_OPTIONS);
    }

    /** DATA-23: the hash of 32 random bytes nobody ever sees, so the account can never be signed in to again. */
    hashUnusable(): Promise<string> {
        return argon2.hash(randomBytes(DUMMY_SECRET_BYTES).toString('hex'), HASH_OPTIONS);
    }

    async verify(hash: string, password: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, password);
        } catch {
            return false;
        }
    }

    /** AUTH-4: verified against when the email is unknown, so timing does not reveal accounts. */
    async verifyDummy(password: string): Promise<void> {
        await this.verify(await this.dummyHash, password);
    }

    /**
     * A random 16-character password that meets the password rules (an upper- and a lower-case
     * letter, a digit, a symbol) — given out once when an admin creates an account. Unambiguous characters only
     * (no 0/O, 1/l/I), so a password read off a screen is typed right; a Fisher–Yates shuffle with a CSPRNG keeps
     * the guaranteed classes from always coming first.
     */
    generateTemporary(): string {
        const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
        while (chars.length < TEMPORARY_LENGTH) {
            chars.push(pick(ALL));
        }
        for (let index = chars.length - 1; index > 0; index -= 1) {
            const other = randomInt(index + 1);
            [chars[index], chars[other]] = [chars[other] ?? '', chars[index] ?? ''];
        }
        return chars.join('');
    }

    needsRehash(hash: string): boolean {
        return argon2.needsRehash(hash, HASH_OPTIONS);
    }
}
