# utimes

Change the `btime`, `mtime`, and `atime` of files on Windows, macOS and Linux.

```ts
import { utimes } from 'utimes';

utimes('/path/to/file', {
	btime: 447775200000 // 1984-03-10T14:00:00.000Z
});
```

## Installation

Install with either `npm` or `yarn`:

```
npm install utimes
yarn add utimes
```

## Usage

The library exports a function called `utimes`:

```ts
function utimes(path: string, options: TimeOptions): Promise<void>;
function utimes(paths: string[], options: TimeOptions): Promise<void>;
```

Set timestamps on the file(s) by passing an object with the `btime`, `mtime`, and `atime` as unix millisecond timestamps. If any of these properties are set to `undefined`, `null`, or `0`, then the existing timestamps will be preserved.

```ts
utimes('/path/to/file', {
	btime: 447775200000,
	atime: 447775200000,
	mtime: 444328600000
});
```

Set all three timestamps to the same value by passing a single millisecond timestamp. Passing `0` will immediately return without making any changes to the file.

```ts
utimes('/path/to/file', 447775200000);
```

## Caveats

- Linux does not support setting the `btime` timestamp – attempts to do so will be silently ignored.
- File descriptors are not supported.

## Credits

This is a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with compatibility changes by [Jule-](https://github.com/Jule-) to support modern versions of Node.js. It's not backwards-compatible.
