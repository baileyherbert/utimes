/**
 * Sets the times on the specified target file.
 *
 * @param path Path to the target file.
 * @param options Object containing the desired `btime`, `mtime`, and `atime` as numbers (in milliseconds).
 */
export function utimes(path: string, options: TimeOptions): Promise<void>;

/**
 * Sets the times on the specified target files.
 *
 * @param path Array of paths to the target files.
 * @param options Object containing the desired `btime`, `mtime`, and `atime` as numbers (in milliseconds).
 */
export function utimes(paths: string[], options: TimeOptions): Promise<void>;

export = utimes;
export default utimes;

export interface TimeOptions {
	/**
	 * The birth time in milliseconds.
	 */
	btime?: number;

	/**
	 * The modification time in milliseconds.
	 */
	mtime?: number;

	/**
	 * The access time in milliseconds.
	 */
	atime?: number;
}
