import fs from 'fs';
import path from 'path';

/**
 * The native addon binding.
 */
const nativeAddon = (function() {
	const gyp = require('@mapbox/node-pre-gyp');
	const packagePath = path.resolve(path.join(__dirname, '../package.json'));
	const addonPath: string = gyp.find(packagePath);

	if (!fs.existsSync(addonPath)) {
		throw new Error(
			'Could not find the "utimes.node" file. See: https://github.com/baileyherbert/utimes/issues/12'
		);
	}

	return require(addonPath);
})();

/**
 * Whether or not the current platform supports the native addon.
 */
const useNativeAddon = ['darwin', 'win32', 'linux'].indexOf(process.platform) >= 0;

/**
 * Updates the timestamps on the given path(s).
 *
 * If a `callback` function is provided, it will be invoked after the operation completes with an optional error
 * argument. Otherwise, a promise will be returned.
 *
 * @param path
 * @param options
 * @param callback
 */
export function utimes(path: Paths, options: TimeOptions): Promise<void>;
export function utimes(path: Paths, options: TimeOptions, callback: Callback): void;
export function utimes(path: Paths, options: TimeOptions, callback?: Callback) {
	return invokeWrapped(path, options, true, callback);
}


/**
 * Updates the timestamps on the given path(s). If the path(s) point to a symbolic link, then the timestamps of
 * the symbolic link itself are changed.
 *
 * If a `callback` function is provided, it will be invoked after the operation completes with an optional error
 * argument. Otherwise, a promise will be returned.
 *
 * @param path
 * @param options
 * @param callback
 */
export function lutimes(path: Paths, options: TimeOptions): Promise<void>;
export function lutimes(path: Paths, options: TimeOptions, callback: Callback): void;
export function lutimes(path: Paths, options: TimeOptions, callback?: Callback) {
	return invokeWrapped(path, options, false, callback);
}

/**
 * Invokes utimes with the given options, and implements callbacks/promises based on the parameters.
 *
 * @param path
 * @param options
 * @param resolveLinks
 * @param callback
 * @returns
 */
function invokeWrapped(path: Paths, options: TimeOptions, resolveLinks: boolean, callback?: Callback) {
	if (typeof callback === 'function') {
		return invokeUTimes(path, options, resolveLinks, callback);
	}
	else {
		return new Promise<void>((resolve, reject) => {
			invokeUTimes(path, options, resolveLinks, error => {
				if (typeof error !== 'undefined') {
					reject(error);
				}
				else {
					resolve();
				}
			});
		});
	}
}

/**
 * Invokes utimes with the given options.
 *
 * @param path A string path or an array of string paths.
 * @param options The timestamps to use.
 * @param resolveLinks Whether or not to resolve symbolic links and update their target file instead.
 * @param callback Function to invoke when completed.
 * @returns
 */
function invokeUTimes(path: Paths, options: TimeOptions, resolveLinks: boolean, callback: Callback) {
	const targets = getNormalizedPaths(path);
	const times = getNormalizedOptions(options);
	const flags = getFlags(times);

	const invokeAtIndex = (index: number) => {
		const target = targets[index];

		if (target === undefined) {
			return callback();
		}

		// Invoke the native addon on supported platforms
		if (useNativeAddon) {
			invokeBinding(
				target,
				times,
				flags,
				resolveLinks,
				error => error !== undefined ? callback(error) : invokeAtIndex(index + 1)
			);
		}

		// Fall back to using `fs.utimes` for other platforms
		else {
			fs[resolveLinks ? 'stat' : 'lstat'](target, (statsErr, stats) => {
				if (statsErr) return callback(statsErr);

				fs[resolveLinks ? 'utimes' : 'lutimes'](
					target,
					(flags & 4 ? times.atime : stats.atime.getTime()) / 1000,
					(flags & 2 ? times.mtime : stats.mtime.getTime()) / 1000,
					error => error ? callback(error) : invokeAtIndex(index + 1)
				);
			});
		}
	};

	// Return if there's nothing to do
	if (!flags || !targets.length) {
		return callback();
	}

	// Start setting timestamps
	invokeAtIndex(0);
}

/**
 * Converts the given string or string array into a guaranteed array of strings.
 *
 * @param paths
 */
function getNormalizedPaths(paths: Paths): string[] {
	if (typeof paths === 'string') {
		assertPath('path', paths);
		return [paths];
	}

	if (Array.isArray(paths)) {
		for (let i = 0; i < paths.length; i++) {
			const path = paths[i];
			assertPath(`paths[${i}]`, path);
		}

		return paths;
	}

	throw new Error('Path must be a string or array');
}

/**
 * Replaces missing options with zero values.
 *
 * @param options
 */
function getNormalizedOptions(options: TimeOptions): NormalizedTimeOptions {
	if (typeof options === 'number') {
		options = {
			btime: options,
			mtime: options,
			atime: options
		};
	}

	if (typeof options === 'undefined' || options === null) {
		options = {
			btime: 0,
			mtime: 0,
			atime: 0
		};
	}

	if (typeof options !== 'object') {
		throw new Error('Options must be an object');
	}

	assertTimestamp('btime', options.btime);
	assertTimestamp('mtime', options.mtime);
	assertTimestamp('atime', options.atime);

	return {
		btime: options.btime || 0,
		mtime: options.mtime || 0,
		atime: options.atime || 0
	};
}

/**
 * Calculates the flags to send to the binding.
 *
 * @param options
 */
function getFlags(options: NormalizedTimeOptions): number {
	let flags = 0;

	if (options.btime) flags |= 1;
	if (options.mtime) flags |= 2;
	if (options.atime) flags |= 4;

	return flags;
}

/**
 * Calls the binding and invokes a callback function.
 *
 * @param path
 * @param times
 * @param flags
 */
function invokeBinding(path: string, times: NormalizedTimeOptions, flags: number, resolveLinks: boolean, callback: Callback): void {
	nativeAddon.utimes(getPathBuffer(path), flags, times.btime, times.mtime, times.atime, resolveLinks, (result?: Error) => {
		if (typeof result !== 'undefined') {
			const message = result.message.trim().replace(/\.$/, '');
			callback(new Error(`${message}, utimes '${path}'`));
			return;
		}

		callback();
	});
}

/**
 * Converts a path string into a buffer.
 *
 * @param target
 * @returns
 */
function getPathBuffer(target: string) {
	const targetLong = (path as any)._makeLong(target);
	const buffer = Buffer.alloc(Buffer.byteLength(targetLong, 'utf-8') + 1);

	buffer.write(targetLong, 0, buffer.length - 1, 'utf-8');
	buffer[buffer.length - 1] = 0;

	if (buffer.indexOf(0) !== buffer.length - 1) {
		throw new Error('Path must be a string without null bytes');
	}

	return buffer;
}

/**
 * @param key
 * @param value
 */
function assertPath(key: string, value: any) {
	if (typeof value !== 'string') {
		throw new Error(key + ' must be a string');
	}

	if (value.length === 0) {
		throw new Error(key + ' must not be empty');
	}

	if (value.indexOf('\u0000') !== -1) {
		throw new Error(key + ' must be a string without null bytes');
	}
}

function assertTimestamp(key: string, value: any) {
	if (value === undefined) {
		return;
	}

	if (typeof value !== 'number') {
		throw new Error(key + ' must be a number or undefined');
	}

	if (Math.floor(value) !== value) {
		throw new Error(key + ' must be an integer');
	}

	if (value < 0) {
		throw new Error(key + ' must be a positive integer');
	}

	if (value > Math.pow(2, 48) - 1) {
		throw new Error(key + ' must not be more than ' + (Math.pow(2, 48) - 1));
	}
}

/**
 * Options for choosing which timestamps to set on files. You can supply a single number to set that as the
 * timestamp for all three, or supply individual timestamps within an object.
 */
export type TimeOptions = number | null | undefined | Partial<NormalizedTimeOptions>;

type Paths = string | string[];
type Callback = (error?: Error) => void;
type NormalizedTimeOptions = {
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
