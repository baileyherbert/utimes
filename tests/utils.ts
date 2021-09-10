import { utimes } from '../src/main';
import fs from 'fs';
import assert from 'assert';
import util from 'util';

/**
 * Returns the timestamps for the given file.
 *
 * @param filePath
 * @returns
 */
export function getFileTimes(filePath: string): ResolvedTimestampCollection {
	const stats = fs.statSync(filePath);

	return {
		atime: stats.atime.getTime(),
		btime: stats.birthtime.getTime(),
		mtime: stats.mtime.getTime()
	};
}

/**
 * Asserts that the given file's timestamps match the given times.
 *
 * @param filePath
 * @param expected
 */
export function assertFileTimes(filePath: string, expected: UTimestampCollection) {
	const actual = getFileTimes(filePath);

	if (typeof expected.atime !== 'undefined') {
		assert.equal(actual.atime, expected.atime, getTimeMismatchMessage('atime', actual, expected));
	}

	if (typeof expected.btime !== 'undefined' && process.platform !== 'linux') {
		assert.equal(actual.btime, expected.btime, getTimeMismatchMessage('btime', actual, expected));
	}

	if (typeof expected.mtime !== 'undefined') {
		assert.equal(actual.mtime, expected.mtime, getTimeMismatchMessage('mtime', actual, expected));
	}
}

/**
 * Asserts that the given file's timestamps match (or are relatively close to) the given times.
 *
 * @param filePath
 * @param expected
 * @param margin Milliseconds
 */
export function assertFileTimesLoosely(filePath: string, expected: ResolvedTimestampCollection, margin = 10) {
	const actual = getFileTimes(filePath);
	const diff = (a: number, b: number) => Math.abs(a - b);

	assert(diff(actual.atime, expected.atime) <= margin, getTimeMismatchMessage('atime', actual, expected));
	assert(diff(actual.mtime, expected.mtime) <= margin, getTimeMismatchMessage('mtime', actual, expected));

	if (process.platform !== 'linux') {
		assert(diff(actual.btime, expected.btime) <= margin, getTimeMismatchMessage('btime', actual, expected));
	}
}

/**
 * Runs the given callback, and asserts after it completes that the given file's timestamps have not changed.
 *
 * @param filePath
 * @param callback
 */
export async function assertTimesUnchanged(filePath: string, callback: (...args: any[]) => any) {
	const timesBefore = getFileTimes(filePath);
	await callback();
	assertFileTimes(filePath, timesBefore);
}

/**
 * Returns an error message to use for a timestamp mismatch.
 *
 * @param name
 * @param actual
 * @param expected
 */
export function getTimeMismatchMessage(name: 'atime' | 'btime' | 'mtime', actual: UTimestampCollection, expected: UTimestampCollection) {
	return util.format(
		'Incorrect timestamp for %s, expected %s, got %s',
		name,
		JSON.stringify(expected),
		JSON.stringify(actual)
	);
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @returns
 */
export function getNow(): UTimestampCollection {
	const now = (new Date()).getTime();

	return {
		atime: now,
		btime: now,
		mtime: now
	};
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param a
 * @param b
 * @returns
 */
export function mergeTimes(a: UTimestampCollection, b: UTimestampCollection | number): UTimestampCollection {
	if (typeof b === 'number') {
		b = {
			mtime: b,
			atime: b,
			btime: b
		};
	}

	return Object.assign(a, b);
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param filePath
 * @param times
 * @returns
 */
export async function testSetTimes(filePath: string, times: UTimestampCollection | number) {
	const now = getFileTimes(filePath);
	const expected = mergeTimes(now, times);

	await utimes(filePath, times);
	assertFileTimes(filePath, expected);
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param filePath
 * @param times
 * @returns
 */
export async function testSetTimesCallback(filePath: string, times: UTimestampCollection | number) {
	return new Promise<void>((resolve, reject) => {
		const now = getFileTimes(filePath);
		const expected = mergeTimes(now, times);

		utimes(filePath, times, error => {
			if (error) return reject(error);

			assertFileTimes(filePath, expected);
			resolve();
		});
	});
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param filePath
 * @param times
 * @returns
 */
export async function testSetTimesMulti(filePaths: string[], times: UTimestampCollection | number) {
	const targets = filePaths.map(path => ({ path, expected: mergeTimes(getFileTimes(path), times) }));
	await utimes(filePaths, times);

	for (const file of targets) {
		assertFileTimes(file.path, file.expected);
	}
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param filePath
 * @param times
 * @returns
 */
export async function testSetTimesMultiCallback(filePaths: string[], times: UTimestampCollection | number) {
	return new Promise<void>((resolve, reject) => {
		const targets = filePaths.map(path => ({ path, expected: mergeTimes(getFileTimes(path), times) }));
		utimes(filePaths, times, error => {
			if (error) return reject(error);

			for (const file of targets) {
				assertFileTimes(file.path, file.expected);
			}

			resolve();
		});
	});
}

export type ResolvedTimestampCollection = {
	/**
	 * The birth time in milliseconds.
	 */
	btime: number;

	/**
	 * The modification time in milliseconds.
	 */
	mtime: number;

	/**
	 * The access time in milliseconds.
	 */
	atime: number;
};

export type UTimestampCollection = Partial<ResolvedTimestampCollection>;
