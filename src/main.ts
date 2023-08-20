let _fsResolved: typeof import('fs');
let _pathResolved: typeof import('path');
let _bindingResolved: any;

/**
 * Wrapper on the `require` function to trick bundlers and avoid including mapbox dependencies.
 *
 * @param name
 * @returns
 */
const __require = (name: string) => require(name);

/**
 * Resolves the `fs` module and caches it.
 *
 * @returns
 */
function fs() {
	if (!_fsResolved) {
		_fsResolved = __require('fs');
	}

	return _fsResolved;
}

/**
 * Resolves the `path` module and caches it.
 *
 * @returns
 */
function path() {
	if (!_pathResolved) {
		_pathResolved = __require('path');
	}

	return _pathResolved;
}

/**
 * The native addon binding.
 */
function nativeAddon() {
	if (_bindingResolved === undefined) {
		const gyp = __require('@mapbox/node-pre-gyp');
		const packagePath = path().resolve(path().join(__dirname, '../package.json'));
		const addonPath: string = gyp.find(packagePath);

		if (!fs().existsSync(addonPath)) {
			return _bindingResolved = null;
		}

		_bindingResolved = __require(addonPath);
	}

	return _bindingResolved;
};

/**
 * Whether or not the current platform supports the native addon.
 */
function useNativeAddon() {
	if (typeof process !== 'undefined' && ['darwin', 'win32', 'linux'].indexOf(process.platform) >= 0) {
		if (_bindingResolved === undefined) {
			nativeAddon();
		}

		if (_bindingResolved === null) {
			return false;
		}

		return true;
	}

	return false;
}

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
 * Synchronously updates the timestamps on the given path(s).
 *
 * @param path
 * @param options
 */
export function utimesSync(path: Paths, options: TimeOptions): void {
	return invokeUTimesSync(path, options, true);
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
 * Synchronously updates the timestamps on the given path(s).
 *
 * @param path
 * @param options
 */
export function lutimesSync(path: Paths, options: TimeOptions): void {
	return invokeUTimesSync(path, options, false);
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
	if (typeof process === 'undefined') {
		return callback();
	}

	const targets = getNormalizedPaths(path);
	const times = getNormalizedOptions(options);
	const flags = getFlags(times);

	const invokeAtIndex = (index: number) => {
		const target = targets[index];

		if (target === undefined) {
			return callback();
		}

		// Invoke the native addon on supported platforms
		if (useNativeAddon()) {
			invokeBindingAsync(
				target,
				times,
				flags,
				resolveLinks,
				error => error !== undefined ? callback(error) : invokeAtIndex(index + 1)
			);
		}

		// Fall back to using `fs.utimes` for other platforms
		else {
			fs()[resolveLinks ? 'stat' : 'lstat'](target, (statsErr, stats) => {
				if (statsErr) return callback(statsErr);

				fs()[resolveLinks ? 'utimes' : 'lutimes'](
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
 * Invokes utimes synchronously with the given options.
 *
 * @param path A string path or an array of string paths.
 * @param options The timestamps to use.
 * @param resolveLinks Whether or not to resolve symbolic links and update their target file instead.
 * @returns
 */
function invokeUTimesSync(path: Paths, options: TimeOptions, resolveLinks: boolean) {
	if (typeof process === 'undefined') {
		return;
	}

	const targets = getNormalizedPaths(path);
	const times = getNormalizedOptions(options);
	const flags = getFlags(times);

	const invokeAtIndex = (index: number) => {
		const target = targets[index];

		if (target === undefined) {
			return;
		}

		// Invoke the native addon on supported platforms
		if (useNativeAddon()) {
			invokeBindingSync(target, times, flags, resolveLinks);
			invokeAtIndex(index + 1);
		}

		// Fall back to using `fs.utimes` for other platforms
		else {
			const stats = fs()[resolveLinks ? 'statSync' : 'lstatSync'](target);

			fs()[resolveLinks ? 'utimesSync' : 'lutimesSync'](
				target,
				(flags & 4 ? times.atime : stats.atime.getTime()) / 1000,
				(flags & 2 ? times.mtime : stats.mtime.getTime()) / 1000
			);

			invokeAtIndex(index + 1);
		}
	};

	// Return if there's nothing to do
	if (!flags || !targets.length) {
		return;
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

	if (options instanceof Date) {
		options = {
			btime: options.getTime(),
			mtime: options.getTime(),
			atime: options.getTime()
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

	const btime = getTime('btime', options.btime);
	const mtime = getTime('mtime', options.mtime);
	const atime = getTime('atime', options.atime);

	assertTimestamp('btime', btime);
	assertTimestamp('mtime', mtime);
	assertTimestamp('atime', atime);

	return {
		btime: btime || 0,
		mtime: mtime || 0,
		atime: atime || 0
	};
}

/**
 * Converts a time input into a timestamp number.
 *
 * @param key
 * @param input
 * @returns
 */
function getTime(key: string, input?: Date | number): number | undefined {
	if (typeof input === 'number' || typeof input === 'undefined') {
		return input;
	}

	if (typeof input === 'object' && typeof input.getTime === 'function') {
		return input.getTime();
	}

	throw new Error(key + ' must be a number or Date');
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
function invokeBindingAsync(path: string, times: NormalizedTimeOptions, flags: number, resolveLinks: boolean, callback: Callback): void {
	nativeAddon().utimes(getPathBuffer(path), flags, times.btime, times.mtime, times.atime, resolveLinks, (result?: Error) => {
		if (typeof result !== 'undefined') {
			const name = resolveLinks ? 'utimes' : 'lutimes';
			const message = result.message.trim().replace(/\.$/, '');
			callback(new Error(`${message}, ${name} '${path}'`));
			return;
		}

		callback();
	});
}

/**
 * Calls the binding synchronously.
 *
 * @param path
 * @param times
 * @param flags
 */
function invokeBindingSync(path: string, times: NormalizedTimeOptions, flags: number, resolveLinks: boolean): void {
	try {
		nativeAddon().utimesSync(getPathBuffer(path), flags, times.btime, times.mtime, times.atime, resolveLinks);
	}
	catch (error) {
		const name = resolveLinks ? 'utimes' : 'lutimes';
		const message = (<any>error).message.trim().replace(/\.$/, '');
		throw new Error(`${message}, ${name} '${path}'`);
	}
}

/**
 * Converts a path string into a buffer.
 *
 * @param target
 * @returns
 */
function getPathBuffer(target: string) {
	const targetLong = (path() as any)._makeLong(target);
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
export type TimeOptions = Date | number | null | undefined | {
	/**
	 * The birth time in milliseconds.
	 */
	btime?: Date | number;

	/**
	 * The modification time in milliseconds.
	 */
	mtime?: Date | number;

	/**
	 * The access time in milliseconds.
	 */
	atime?: Date | number;
};

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
