# utimes

Change the `btime`, `mtime`, and `atime` of files on Windows, macOS and Linux.

```ts
import utimes from 'utimes';

utimes('/path/to/file', {
	btime: 447775200000 // 1984-03-10T14:00:00.000Z
});
```

## Installation

```
npm install utimes
```

## Usage

The library exports a function called `utimes` (also accessible as a default export):

```ts
function utimes(path, options): Promise<void>
```

The `options` parameter is an object containing any of the following times, which should be passed as Unix millisecond timestamps:

- `btime`
- `mtime`
- `atime`

If any of these properties are `undefined`, they will not be changed on the file.

## Caveats

- Linux does not support setting the `btime` timestamp.
- File descriptors are not supported.

## Credits

This is a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with compatibility changes by [Jule-](https://github.com/Jule-) to support modern versions of Node.js. It's not backwards-compatible, as I have modernized the API a bit.
