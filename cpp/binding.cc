#include <napi.h>
#include <uv.h>
#include <stdint.h>

#if defined(__APPLE__)
	#include <sys/attr.h>
	#include <unistd.h>
#elif defined(__linux__)
	#include <sys/stat.h>
	#include <fcntl.h>
#elif defined(_WIN32)
	#include <io.h>
	#include <windows.h>

	void set_utimes_filetime(const uint64_t time, FILETIME* filetime) {
		int64_t temp = (int64_t) ((time * 10000ULL) + 116444736000000000ULL);
		(filetime)->dwLowDateTime = (DWORD) (temp & 0xFFFFFFFF);
		(filetime)->dwHighDateTime = (DWORD) (temp >> 32);
	}
#endif

#if defined(__APPLE__) || defined(__linux__)
	inline void set_timespec(uint64_t time, timespec* out) {
		(out)->tv_sec = (time_t) (time / 1000);
		(out)->tv_nsec = (long) ((time % 1000) * 1000000);
	}
#endif

int set_utimes(
	const char* path,
	const uint8_t flags,
	const uint64_t btime,
	const uint64_t mtime,
	const uint64_t atime,
	const bool resolveLinks
) {
	if (flags == 0) return 0;

	#if defined(__APPLE__)
		struct attrlist attrList;
		struct timespec utimes[3];
		struct attrBuff {
			u_int32_t ssize;
			struct timespec created;
			struct timespec modified;
			struct timespec accessed;
		} __attribute__ ((packed));

		struct attrBuff attrBuf;

		memset(&attrList, 0, sizeof(struct attrlist));

		attrList.bitmapcount = ATTR_BIT_MAP_COUNT;
		attrList.commonattr = ATTR_CMN_CRTIME | ATTR_CMN_MODTIME | ATTR_CMN_ACCTIME;

		int err;
		err = getattrlist(path, &attrList, &attrBuf, sizeof(attrBuf), resolveLinks ? FSOPT_NOFOLLOW : 0);

		if (err == 0) {
			assert(sizeof(attrBuf) == attrBuf.ssize);
			memcpy(&utimes, &(attrBuf.created), sizeof(struct timespec) * 3);

			if (flags & 1) set_timespec(btime, &(utimes[0]));
			if (flags & 2) set_timespec(mtime, &(utimes[1]));
			if (flags & 4) set_timespec(atime, &(utimes[2]));

			err = setattrlist(path, &attrList, &utimes, sizeof(utimes), resolveLinks ? FSOPT_NOFOLLOW : 0);
		}

		return err;
	#elif defined(__linux__)
		struct timespec ts[2];
		if (flags & 4) {
			set_timespec(atime, &(ts[0]));
		} else {
			ts[0].tv_nsec = UTIME_OMIT;
		}

		if (flags & 2) {
			set_timespec(mtime, &(ts[1]));
		} else {
			ts[1].tv_nsec = UTIME_OMIT;
		}

		return utimensat(AT_FDCWD, path, ts, resolveLinks ? AT_SYMLINK_NOFOLLOW : 0);
	#elif defined(_WIN32)
		int chars = MultiByteToWideChar(CP_UTF8, 0, path, -1, NULL, 0);
		if (chars == 0) return GetLastError();

		WCHAR* pathw = (WCHAR*) malloc(chars * sizeof(WCHAR));
		if (pathw == NULL) return ERROR_OUTOFMEMORY;

		MultiByteToWideChar(CP_UTF8, 0, path, -1, pathw, chars);
		HANDLE handle = CreateFileW(
			pathw,
			FILE_WRITE_ATTRIBUTES,
			FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
			NULL,
			OPEN_EXISTING,
			FILE_FLAG_BACKUP_SEMANTICS | (resolveLinks ? FILE_FLAG_OPEN_REPARSE_POINT : 0),
			NULL
		);
		free(pathw);

		if (handle == INVALID_HANDLE_VALUE) return GetLastError();

		FILETIME btime_filetime;
		FILETIME mtime_filetime;
		FILETIME atime_filetime;

		if (flags & 1) set_utimes_filetime(btime, &btime_filetime);
		if (flags & 2) set_utimes_filetime(mtime, &mtime_filetime);
		if (flags & 4) set_utimes_filetime(atime, &atime_filetime);

		bool success = SetFileTime(
			handle,
			(flags & 1) ? &btime_filetime : NULL,
			(flags & 4) ? &atime_filetime : NULL,
			(flags & 2) ? &mtime_filetime : NULL
		);

		CloseHandle(handle);

		return success ? 0 : GetLastError();
	#else
		return -1;
	#endif
}

class UtimesWorker : public Napi::AsyncWorker {
	public:
		UtimesWorker(
			Napi::Buffer<char> &pathHandle,
			const uint8_t flags,
			const uint64_t btime,
			const uint64_t mtime,
			const uint64_t atime,
			const bool resolveLinks,
			const Napi::Function &callback
		) : Napi::AsyncWorker(callback),
			pathHandleRef(Napi::ObjectReference::New(pathHandle, 1)),
			path(pathHandle.Data()),
			flags(flags),
			btime(btime),
			mtime(mtime),
			atime(atime),
			resolveLinks(resolveLinks) {}

		~UtimesWorker() {}

		void Execute() {
			result = set_utimes(path, flags, btime, mtime, atime, resolveLinks);
			if (result > 0) {
				result = -result;
			}
		}

		void OnOK () {
			Napi::HandleScope scope(Env());

			Callback().Call({
				Napi::Number::New(Env(), result)
			});

			pathHandleRef.Unref();
		}

	private:
		Napi::ObjectReference pathHandleRef;
		const char* path;
		const uint8_t flags;
		const uint64_t btime;
		const uint64_t mtime;
		const uint64_t atime;
		const bool resolveLinks;
		int result;
};

void utimes(const Napi::CallbackInfo& info) {
	if (info.Length() != 7 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsNumber() || !info[5].IsBoolean() || !info[6].IsFunction()) {
		throw Napi::Error::New(info.Env(), "bad arguments, expected: ("
			"buffer path, int flags, "
			"seconds btime, seconds mtime, seconds atime, bool resolveLinks, "
			"function callback"
			")"
		);
	}

	Napi::Buffer<char> pathHandle = info[0].As<Napi::Buffer<char>>();
	const uint8_t flags = info[1].As<Napi::Number>().Uint32Value();
	const uint64_t btime = info[2].As<Napi::Number>().Int64Value();
	const uint64_t mtime = info[3].As<Napi::Number>().Int64Value();
	const uint64_t atime = info[4].As<Napi::Number>().Int64Value();
	const bool resolveLinks = info[5].As<Napi::Boolean>().Value();

	Napi::Function callback = info[6].As<Napi::Function>();
	UtimesWorker *worker = new UtimesWorker(pathHandle, flags, btime, mtime, atime, resolveLinks, callback);
	worker->Queue();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports.Set(
		Napi::String::New(env, "utimes"),
		Napi::Function::New<utimes>(env)
	);
	return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
