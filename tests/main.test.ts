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

// Increase timeout
jest.setTimeout(30000);

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
		utils.testSetTimesSync(filePath, { atime: 447775200000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimes(filePath, { mtime: 447775200000 });
		await utils.testSetTimesCallback(filePath, { mtime: 946684800000 });
		utils.testSetTimesSync(filePath, { mtime: 447775200000 });
	});

	nonLinuxIt('Can change btime', async function() {
		await utils.testSetTimes(filePath, { btime: 447775200000 });
		await utils.testSetTimesCallback(filePath, { btime: 946684800000 });
		utils.testSetTimesSync(filePath, { btime: 447775200000 });

		await utils.testSetTimes(filePath, { btime: new Date(447775200000) });
		await utils.testSetTimesCallback(filePath, { btime: new Date(946684800000) });
		utils.testSetTimesSync(filePath, { btime: new Date(447775200000) });
	});

	it('Can change two times at once', async function() {
		await utils.testSetTimes(filePath, { mtime: 223887600000, atime: 223888600000 });
		await utils.testSetTimesCallback(filePath, { mtime: 323887600000, atime: 323888600000 });
		utils.testSetTimesSync(filePath, { mtime: 223887600000, atime: 223888600000 });
	});

	it('Can change all times at once', async function() {
		await utils.testSetTimes(filePath, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		await utils.testSetTimesCallback(filePath, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
		await utils.testSetTimes(filePath, 946684800000);
		await utils.testSetTimes(filePath, new Date(946684800000));
		utils.testSetTimesSync(filePath, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		utils.testSetTimesSync(filePath, 946684800000);
		utils.testSetTimesSync(filePath, new Date(946684800000));
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
		utils.testSetTimesMultiSync(files, { atime: 447775200000 });
	});

	it('Can change mtime', async function() {
		await utils.testSetTimesMulti(files, { mtime: 447775200000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 946684800000 });
		utils.testSetTimesMultiSync(files, { mtime: 447775200000 });
	});

	nonLinuxIt('Can change btime', async function() {
		await utils.testSetTimesMulti(files, { btime: 447775200000 });
		await utils.testSetTimesMultiCallback(files, { btime: 946684800000 });
		utils.testSetTimesMultiSync(files, { btime: 447775200000 });
	});

	it('Can change two times at once', async function() {
		await utils.testSetTimesMulti(files, { mtime: 223887600000, atime: 223888600000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 323887600000, atime: 323888600000 });
		utils.testSetTimesMultiSync(files, { mtime: 223887600000, atime: 223888600000 });
	});

	it('Can change all times at once', async function() {
		await utils.testSetTimesMulti(files, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
		await utils.testSetTimesMultiCallback(files, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
		await utils.testSetTimesMulti(files, 946684800000);
		utils.testSetTimesMultiSync(files, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
	});
});

// Test symlinks
describe('Symbolic link', function() {
	// I develop locally on a Windows machine and symlinks require admin privileges to create for some reason
	// Try to create a symlink file but catch errors
	const symLinkPath = (function() {
		try {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}

			const target = filePath + '-sym';

			fs.writeFileSync(filePath, 'Hello!');
			fs.symlinkSync(filePath, target);

			return target;
		}
		catch (err) {
			return null;
		}
	})();

	// Skip tests if the symlink creation failed
	const wrappedIt = symLinkPath ? it : it.skip;
	const wrappedLinuxIt = (symLinkPath && process.platform !== 'linux') ? it : it.skip;

	symLinkPath && beforeEach(function() {
		fs.unlinkSync(symLinkPath);

		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		fs.writeFileSync(filePath, 'Hello!');
		fs.symlinkSync(filePath, symLinkPath);
	});

	afterAll(function() {
		if (symLinkPath !== null) {
			fs.unlinkSync(symLinkPath);
		}

		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	});

	wrappedIt('Can change atime', async function() {
		await utils.assertTimesUnchanged(filePath, async function() {
			await utils.testSetTimes(symLinkPath!, { atime: 447775200000 }, false);
			await utils.testSetTimesCallback(symLinkPath!, { atime: 946684800000 }, false);
			utils.testSetTimesSync(symLinkPath!, { atime: 447775200000 }, false);
		});
	});

	wrappedIt('Can change atime without affecting symlink', async function() {
		await utils.assertTimesUnchanged(symLinkPath!, async function() {
			await utils.testSetTimes(symLinkPath!, { atime: 447775200000 });
			await utils.testSetTimesCallback(symLinkPath!, { atime: 946684800000 });
			utils.testSetTimesSync(symLinkPath!, { atime: 447775200000 });
		}, false);
	});

	wrappedIt('Can change mtime', async function() {
		await utils.assertTimesUnchanged(filePath, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 447775200000 }, false);
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 946684800000 }, false);
			utils.testSetTimesSync(symLinkPath!, { mtime: 447775200000 }, false);
		});
	});

	wrappedIt('Can change mtime without affecting symlink', async function() {
		await utils.assertTimesUnchanged(symLinkPath!, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 447775200000 });
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 946684800000 });
			utils.testSetTimesSync(symLinkPath!, { mtime: 447775200000 });
		}, false);
	});

	wrappedLinuxIt('Can change btime', async function() {
		await utils.assertTimesUnchanged(filePath, async function() {
			await utils.testSetTimes(symLinkPath!, { btime: 447775200000 }, false);
			await utils.testSetTimesCallback(symLinkPath!, { btime: 946684800000 }, false);
			utils.testSetTimesSync(symLinkPath!, { btime: 447775200000 }, false);
		});
	});

	wrappedLinuxIt('Can change btime without affecting symlink', async function() {
		await utils.assertTimesUnchanged(symLinkPath!, async function() {
			await utils.testSetTimes(symLinkPath!, { btime: 447775200000 });
			await utils.testSetTimesCallback(symLinkPath!, { btime: 946684800000 });
			utils.testSetTimesSync(symLinkPath!, { btime: 447775200000 });
		}, false);
	});

	wrappedIt('Can change two times at once', async function() {
		await utils.assertTimesUnchanged(filePath, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 223887600000, atime: 223888600000 }, false);
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 323887600000, atime: 323888600000 }, false);
		});
	});

	wrappedIt('Can change two times at once without affecting symlink', async function() {
		await utils.assertTimesUnchanged(symLinkPath!, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 223887600000, atime: 223888600000 });
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 323887600000, atime: 323888600000 });
		}, false);
	});

	wrappedIt('Can change all times at once', async function() {
		await utils.assertTimesUnchanged(filePath, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 }, false);
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 }, false);
		});
	});

	wrappedIt('Can change all times at once without affecting symlink', async function() {
		await utils.assertTimesUnchanged(symLinkPath!, async function() {
			await utils.testSetTimes(symLinkPath!, { mtime: 447775200000, atime: 447776200000, btime: 447777200000 });
			await utils.testSetTimesCallback(symLinkPath!, { mtime: 946684800000, atime: 946685800000, btime: 946686800000 });
		}, false);
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

describe('Errors', function() {
	it('Throws for missing files', async function() {
		const filePath = path.join(tempDir, 'nonexistent-file');

		await (async () => {
			const error = await utils.invoke(filePath, { atime: 447775200000 }, true);
			expect(typeof error).toBe('string');

			if (process.platform === 'win32') {
				expect(error).toEqual(`The system cannot find the file specified, utimes '${filePath}'`);
			}
			else {
				expect(error).toEqual(`No such file or directory, utimes '${filePath}'`);
			}
		})();

		await (async () => {
			const error = await utils.invokeCallback(filePath, { atime: 447775200000 }, false);
			expect(typeof error).toBe('string');

			if (process.platform === 'win32') {
				expect(error).toEqual(`The system cannot find the file specified, lutimes '${filePath}'`);
			}
			else {
				expect(error).toEqual(`No such file or directory, lutimes '${filePath}'`);
			}
		})();
	});
});
