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

You can set individual timestamps on the file(s) by passing an object as the `options` parameter, containing the `btime`, `mtime`, and `atime` as unix millisecond timestamps.

If any of these timestamps are not specified in the object, or if they are set to `0`, `undefined`, or `null`, then the existing timestamps on the file(s) will be preserved.

```ts
utimes('/path/to/file', {
	btime: 447775200000,
	atime: 447775200000,
	mtime: 444328600000
});
```

If you need to set all three timestamps to the same value, pass a single timestamp as the `options` parameter. Passing `0` as the value will prevent any changes to the file(s).

```ts
utimes('/path/to/file', 447775200000);
```

## Caveats

- Linux does not support setting the `btime` timestamp.
- File descriptors are not supported.

## Credits

This is a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with compatibility changes by [Jule-](https://github.com/Jule-) to support modern versions of Node.js. It's not backwards-compatible, as I have modernized the API a bit.
