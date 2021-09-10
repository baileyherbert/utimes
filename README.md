# utimes

Change the `btime`, `mtime`, and `atime` of files on Windows, macOS and Linux.

```ts
import { utimes } from 'utimes';

// Update specific timestamps and leave the rest unchanged
utimes('/path/to/file', {
	btime: 447775200000 // 1984-03-10T14:00:00.000Z
});

// Update all timestamps at once
utimes('/path/to/file', Date.now());
```

## Installation

```
npm install utimes
```

## Usage

### `utimes`

This function changes the timestamps on one or more files or directories. If the paths resolve to a symbolic link, the link's target file will be changed.

```ts
function utimes(path: string, options: TimeOptions): Promise<void>;
function utimes(paths: string[], options: TimeOptions): Promise<void>;
```

Pass an object with the `btime`, `mtime`, and `atime` as unix millisecond timestamps. If any of these properties are set to `undefined`, `null`, or `0`, then the existing timestamps will be preserved.

```ts
await utimes('/path/to/file', {
	btime: 447775200000 // mtime and atime will be unchanged
});

await utimes('/path/to/file', {
	btime: 447775200000,
	atime: 447775200000,
	mtime: 444328600000,
});

await utimes('/path/to/file', {
	btime: 447775200000,
	atime: 447775200000,
	mtime: 0 // mtime will be unchanged
});
```

Set all three timestamps to the same value by passing a single millisecond timestamp. Passing `0` will immediately return without making any changes to the file.

```ts
await utimes('/path/to/file', 447775200000);
```

### `lutimes`

This function is identical to `utimes`, except if the paths resolve to symbolic links, then the timestamps will be applied to the links themselves, and the target files will be unaffected.

```ts
await lutimes('/path/to/symlink', {
	btime: 447775200000 // mtime and atime will be unchanged
});
```

### Using callbacks

If you don't want to use promises, you can also pass a callback function as the last argument for both `utimes` and `lutimes`. The first parameter passed to this callback will be the error if applicable, or `undefined` otherwise.

```ts
utimes('/path/to/file', 447775200000, function(error) {
	// Do something!
});
```

## Caveats

- Linux does not support the `btime` timestamp. Attempts to set it will be ignored (other changes will still be applied).
- For platforms other than `win32`, `darwin`, and `linux`, the `fs.utimes` and `fs.lutimes` functions will be used behind the scenes.
- File descriptors are not supported.

## Credits

This is a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with compatibility changes by [Jule-](https://github.com/Jule-) to support modern versions of Node.js. It's not backwards-compatible.
