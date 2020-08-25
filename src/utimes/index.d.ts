declare namespace utimes {
	/**
	 * Sets the times on the specified target file.
	 *
	 * @param path Path to the target file.
	 * @param options Object containing the desired `btime`, `mtime`, and `atime` as numbers (in milliseconds).
	 */
	export function utimes(path: string, options: utimes.TimeOptions): Promise<void>;

	/**
	 * Sets the times on the specified target files.
	 *
	 * @param path Array of paths to the target files.
	 * @param options Object containing the desired `btime`, `mtime`, and `atime` as numbers (in milliseconds).
	 */
	export function utimes(paths: string[], options: utimes.TimeOptions): Promise<void>;

	/**
	 * Options for choosing which timestamps to set on files.
	 */
	export interface TimeOptions {
		/**
		 * The birth time in milliseconds.
		 */
		btime?: number | null | undefined;

		/**
		 * The modification time in milliseconds.
		 */
		mtime?: number | null | undefined;

		/**
		 * The access time in milliseconds.
		 */
		atime?: number | null | undefined;
	}
}

export = utimes;
