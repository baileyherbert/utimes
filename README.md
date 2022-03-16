# utimes

Native addon to change the creation time (`btime`), modified time (`mtime`), and access time (`atime`) of files, directories, and symbolic links on Windows, macOS, and Linux.

## Installation

```
npm install utimes
```

## Usage

### Files & directories

The `utimes()` function is used to update the timestamps on files and directories. For paths which resolve to symbolic links, the link's target file will be changed instead.

```ts
import { utimes } from 'utimes';

// Change all times at once
await utimes('/path/to/file', 447775200000);

// Change specific times (set to undefined or 0 to keep the same value)
await utimes('/path/to/file', {
    btime: 447775200000,
    mtime: undefined,
    atime: undefined
});
```

### Symbolic links

The `lutimes()` function is identical to `utimes()`, but for paths which resolve to symbolic links, the links themselves will be changed, and their target files will be unaffected.

```ts
import { lutimes } from 'utimes';

await lutimes('/path/to/symlink', {
    btime: 447775200000
});
```

### Callbacks

You can provide a function as the last argument to activate callback mode. The first parameter of the callback will be the error if applicable (or `undefined` otherwise). Starting with version 5.0.0 the functions no longer return promises when using callbacks, so you'll need to choose between one or the other.

If you're looking for maximum performance, using callbacks is recommended to avoid the slight delay in promise resolution.

```ts
utimes('/path/to/file', 447775200000, function(error) {
    // Do something!
});
```

### Working synchronously

This package also offers synchronous versions of its functions.

```ts
import { utimesSync, lutimesSync } from 'utimes';

utimesSync('/path/to/file', 447775200000);
lutimesSync('/path/to/symlink', 447775200000);
```

### Errors

Starting with version 5.0.0, this package throws descriptive and user-friendly error messages. Please note that these messages come from the operating system and will not be consistent between systems. Here's an example:

```ts
Error {
    message: "No such file or directory, utimes '/path/to/file'"
}
```

## Prebuilt binaries

Starting with version 5.0.0, prebuilt binaries are available for download on the [releases page](https://github.com/baileyherbert/utimes/releases). When installing the package, it will attempt to download a prebuilt binary for your system if available, and will fall back to building from source otherwise.

Refer to the following table to see the minimum `utimes` version for prebuilt binaries:

|            | x86   | x64   | armv7 | arm64 |
|------------|-------|-------|-------|-------|
| **win32**  | 4.0.3 | 4.0.3 | -     | -     |
| **darwin** | 4.0.3 | 4.0.3 | -     | -     |
| **linux**  | 4.0.3 | 4.0.3 | 5.0.0 | 5.0.0 |

These binaries are available for Node.js versions 10.x and above. They are currently tested against versions 10, 12, 14, 16, and 17.

## Building from source

For platforms which do not have prebuilt binaries available, you will need to build from source. Please note that you must install `node-gyp` globally on your system, along with the appropriate build tools, before building this package.

## Caveats

- Linux does not support setting `btime` and attempts to do so will be silently ignored. Other changes set at the same time will still be applied, so you don't need to check for this yourself.
- File descriptors are not supported.

## Credits

This was originally a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with cross-platform improvements by [Jule-](https://github.com/Jule-). It's not backwards compatible. For those who are migrating from that package, here are the notable changes:

- Uses the native binding on linux to fix race conditions
- Fixed issues with changing specific timestamps on macOS
- Supports changing timestamps for symbolic links (with [`lutimes`](#symbolic-links))
- Throws descriptive errors instead of numbers
- Modern API with both promises and callbacks written in TypeScript

Huge thanks to all of the [contributors](https://github.com/baileyherbert/utimes/graphs/contributors) who helped with maintaining and improving this package!
