import fs from 'fs';
import path from 'path';
import * as utils from './utils';

// Create the temp directory
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
	fs.mkdirSync(tempDir);
}

// Delete temp directory on cleanup
afterAll(function() {
	if (fs.existsSync(tempDir)) {
		fs.rmdirSync(tempDir);
	}
})

// Paths to our test subjects
const filePath = path.join(tempDir, 'temp-file');
const dirPath = path.join(tempDir, 'temp-dir');

// Utility for non-linux tests
const nonLinuxIt = process.platform === 'linux' ? it.skip : it;

// Test on a file
describe('File', function() {
	beforeEach(function() {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		fs.writeFileSync(filePath, 'Hello!');
	})

	afterEach(function() {
		fs.unlinkSync(filePath);
	});

	it('Can change atime', async function() {
		await utils.testSetTimes(filePath, { atime: 447775200000 });
		await utils.testSetTimesCallback(filePath, { atime: 946684800000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimes(filePath, { mtime: 447775200000 });
		await utils.testSetTimesCallback(filePath, { mtime: 946684800000 });
	});

	nonLinuxIt('Can change btime', async function() {
		await utils.testSetTimes(filePath, { btime: 447775200000 });
		await utils.testSetTimesCallback(filePath, { btime: 946684800000 });
	});

	it('Can change two times at once', async function() {
		await utils.testSetTimes(filePath, { mtime: 223887600000, atime: 223888600000 });
		await utils.testSetTimesCallback(filePath, { mtime: 323887600000, atime: 323888600000 });
	});

	it('Can change all times at once', async function() {
		await utils.testSetTimes(filePath, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		await utils.testSetTimesCallback(filePath, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
		await utils.testSetTimes(filePath, 946684800000);
	});
});

// Test on multiple files
describe('Multiple files', function() {
	const files = [
		filePath + '-1',
		filePath + '-2',
		filePath + '-3',
		filePath + '-4',
		filePath + '-5'
	];

	beforeEach(function() {
		for (const file of files) {
			if (fs.existsSync(file)) {
				fs.unlinkSync(file);
			}

			fs.writeFileSync(file, 'Hello!');
		}
	})

	afterEach(function() {
		for (const file of files) {
			fs.unlinkSync(file);
		}
	});

	it('Can change atime', async function() {
		await utils.testSetTimesMulti(files, { atime: 447775200000 });
		await utils.testSetTimesMultiCallback(files, { atime: 946684800000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimesMulti(files, { mtime: 447775200000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 946684800000 });
	});

	nonLinuxIt('Can change btime', async function() {
		await utils.testSetTimesMulti(files, { btime: 447775200000 });
		await utils.testSetTimesMultiCallback(files, { btime: 946684800000 });
	});

	it('Can change two times at once', async function() {
		await utils.testSetTimesMulti(files, { mtime: 223887600000, atime: 223888600000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 323887600000, atime: 323888600000 });
	});

	it('Can change all times at once', async function() {
		await utils.testSetTimesMulti(files, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
		await utils.testSetTimesMulti(files, 946684800000);
	});
});

// Test on a directory
describe('Directory', function() {
	beforeEach(function() {
		if (fs.existsSync(dirPath)) {
			fs.rmdirSync(dirPath);
		}

		fs.mkdirSync(dirPath);
	})

	afterEach(async function() {
		fs.rmdirSync(dirPath);
	});

	it('Can change atime', async function() {
		await utils.testSetTimes(dirPath, { atime: 447775200000 });
		await utils.testSetTimesCallback(dirPath, { atime: 946684800000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimes(dirPath, { mtime: 447775200000 });
		await utils.testSetTimesCallback(dirPath, { mtime: 946684800000 });
	});

	nonLinuxIt('Can change btime', async function() {
		await utils.testSetTimes(dirPath, { btime: 447775200000 });
		await utils.testSetTimesCallback(dirPath, { btime: 946684800000 });
	});

	it('Can change two times at once', async function() {
		await utils.testSetTimes(dirPath, { mtime: 223887600000, atime: 223888600000 });
		await utils.testSetTimesCallback(dirPath, { mtime: 323887600000, atime: 323888600000 });
	});

	it('Can change all times at once', async function() {
		await utils.testSetTimes(dirPath, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		await utils.testSetTimesCallback(dirPath, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
	});
});
