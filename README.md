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

You can provide a function as the last argument to activate callback mode. The first parameter of the callback will be the error if applicable (or `undefined` otherwise).
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

This package throws descriptive and user-friendly error messages. These messages come from the operating system and may not be consistent between platforms. Here's an example:

```ts
Error {
    message: "No such file or directory, utimes '/path/to/file'"
}
```

## Prebuilt binaries

This package uses C++ bindings that must be built for the current operating system and architecture. Because build tools are often not available, prebuilt binaries are provided for common platforms, and will be downloaded where applicable during package installation. These binaries are public and can be found on the [releases page](https://github.com/baileyherbert/utimes/releases).

The latest version of `utimes` provides the following prebuilt binaries:

|            | x86 | x64 | armv7 | arm64 |
| ---------- | --- | --- | ----- | ----- |
| **win32**  | ✅  | ✅  | -     | -     |
| **darwin** | ✅  | ✅  | -     | -     |
| **linux**  | ✅  | ✅  | ✅    | ✅    |

If the native binding cannot be downloaded nor built, the package will fall back to using the built-in `fs` functions. This means `btime` will not be modifiable on any platform, and performance will decrease moderately.

## Caveats

- Linux does not support setting `btime` and attempts to do so will be silently ignored. Other changes set at the same time will still be applied, so you don't need to check for this yourself.
- File descriptors are not supported.

## Credits

This was originally a fork of [@ronomon/utimes](https://www.npmjs.com/package/@ronomon/utimes) with cross-platform improvements by [Jule-](https://github.com/Jule-). It's not backwards compatible. For those who are migrating from that package, here are the notable changes:

- Provides a native binding for all platforms
- Provides prebuilt binaries to fix common installation issues
- Supports synchronous operations
- Supports changing timestamps for symbolic links (with [`lutimes`](#symbolic-links))
- Throws descriptive error messages
- Modern API with both promises and callbacks written in TypeScript

Huge thanks to all of the [contributors](https://github.com/baileyherbert/utimes/graphs/contributors) who helped with maintaining and improving this package!
