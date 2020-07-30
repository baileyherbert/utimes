const utimes = require('../src/utimes');
const assert = require('assert');
const utils = require('./utils');

const fs = require('fs');
const path = require('path');

// Create the temp directory
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
	fs.mkdirSync(tempDir);
}

// Delete temp directory on cleanup
after(function() {
	if (fs.existsSync(tempDir)) {
		fs.rmdirSync(tempDir);
	}
})

// Paths to our test subjects
const filePath = path.join(tempDir, 'temp-file');
const dirPath = path.join(tempDir, 'temp-dir');

// Test on a file
describe('File', function() {
	let createTime;

	before(function() {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		createTime = utils.getNow();
		fs.writeFileSync(filePath, 'Hello!');
	})

	after(function() {
		fs.unlinkSync(filePath);
	});

	it('Has default timestamps', function() {
		utils.assertFileTimesLoosely(filePath, createTime);
	});

	it('Can change atime', async function() {
		await utils.testSetTimes(filePath, { atime: 447775200000 });
		await utils.testSetTimes(filePath, { atime: 946684800000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimes(filePath, { mtime: 447775200000 });
		await utils.testSetTimes(filePath, { mtime: 946684800000 });
	});

	it('Can change btime', async function() {
		if (process.platform === 'linux') {
			// btime cannot be changed on linux
			return this.skip();
		}

		await utils.testSetTimes(filePath, { btime: 447775200000 });
		await utils.testSetTimes(filePath, { btime: 946684800000 });
	});
});

// Test on a directory
describe('Directory', function() {
	let createTime;

	before(function() {
		if (fs.existsSync(dirPath)) {
			fs.rmdirSync(dirPath);
		}

		createTime = utils.getNow();
		fs.mkdirSync(dirPath);
	})

	after(async function() {
		fs.rmdirSync(dirPath);
	});

	it('Has default timestamps', function() {
		utils.assertFileTimesLoosely(dirPath, createTime);
	});

	it('Can change atime', async function() {
		await utils.testSetTimes(dirPath, { atime: 447775200000 });
		await utils.testSetTimes(dirPath, { atime: 946684800000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimes(dirPath, { mtime: 447775200000 });
		await utils.testSetTimes(dirPath, { mtime: 946684800000 });
	});

	it('Can change btime', async function() {
		if (process.platform === 'linux') {
			// btime cannot be changed on linux
			return this.skip();
		}

		await utils.testSetTimes(dirPath, { btime: 447775200000 });
		await utils.testSetTimes(dirPath, { btime: 946684800000 });
	});
});
