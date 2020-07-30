const fs = require('fs');
const assert = require('assert');
const util = require('util');
const utimes = require('../src/utimes');

/**
 * Returns the timestamps for the given file.
 *
 * @param {string} filePath
 * @returns {{ btime: number, mtime: number, atime: number }}
 */
function getFileTimes(filePath) {
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
 * @param {string} filePath
 * @param {{ btime: number, mtime: number, atime: number }} expected
 */
function assertFileTimes(filePath, expected) {
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
 * @param {string} filePath
 * @param {{ btime: number, mtime: number, atime: number }} expected
 * @param {number} margin
 */
function assertFileTimesLoosely(filePath, expected, margin = 10) {
	const actual = getFileTimes(filePath);
	const diff = (a, b) => Math.abs(a - b);

	assert(diff(actual.atime, expected.atime) <= margin, getTimeMismatchMessage('atime', actual, expected));
	assert(diff(actual.mtime, expected.mtime) <= margin, getTimeMismatchMessage('mtime', actual, expected));

	if (process.platform !== 'linux') {
		assert(diff(actual.btime, expected.btime) <= margin, getTimeMismatchMessage('btime', actual, expected));
	}
}

/**
 * Returns an error message to use for a timestamp mismatch.
 *
 * @param {'atime' | 'btime' | 'mtime'} name
 * @param {any} actual
 * @param {any} expected
 */
function getTimeMismatchMessage(name, actual, expected) {
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
 * @returns {{ btime: number, mtime: number, atime: number }}
 */
function getNow() {
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
 * @param {{ btime?: number, mtime?: number, atime?: number }} a
 * @param {{ btime?: number, mtime?: number, atime?: number }} b
 * @returns {{ btime?: number, mtime?: number, atime?: number }}
 */
function mergeTimes(a, b) {
	return Object.assign(a, b);
}

/**
 * Returns the current timestamp as an object with `btime`, `mtime`, and `atime`.
 *
 * @param {string} filePath
 * @param {{ btime?: number, mtime?: number, atime?: number }} times
 * @returns {Promise<void>}
 */
async function testSetTimes(filePath, times) {
	const now = getFileTimes(filePath);
	const expected = mergeTimes(now, times);

	await utimes(filePath, expected);
	assertFileTimes(filePath, expected);
}

module.exports = {
	getFileTimes,
	assertFileTimes,
	assertFileTimesLoosely,
	mergeTimes,
	testSetTimes,
	getNow
};
