#include <napi.h>
#include <uv.h>
#include <stdint.h>

#if defined(__APPLE__)
	#include <sys/attr.h>
	#include <unistd.h>

	struct FileTimeAttrs {
		long length;
		struct timespec crtime;
		struct timespec modtime;
		struct timespec acctime;
	};
#elif defined(_WIN32)
	#include <io.h>
	#include <windows.h>

	void set_utimes_filetime(const uint64_t time, FILETIME* filetime) {
		int64_t temp = (int64_t) ((time * 10000ULL) + 116444736000000000ULL);
		(filetime)->dwLowDateTime = (DWORD) (temp & 0xFFFFFFFF);
		(filetime)->dwHighDateTime = (DWORD) (temp >> 32);
	}
#endif

int set_utimes(const char* path, const uint8_t flags, const uint64_t btime, const uint64_t mtime, const uint64_t atime) {
	if (flags == 0) return 0;

	#if defined(__APPLE__)
		attrlist retrieveAttrs;
		struct FileTimeAttrs retrieveBuf;

		// TODO: Investigate issues setting timestamps when all 3 attributes aren't set simultaneously
		// Nasty temporary fix:
		if (flags != 7) {
			memset(&retrieveAttrs, 0, sizeof(retrieveAttrs));
			retrieveAttrs.bitmapcount = ATTR_BIT_MAP_COUNT;
			retrieveAttrs.commonattr = ATTR_CMN_CRTIME | ATTR_CMN_MODTIME | ATTR_CMN_ACCTIME;

			if (getattrlist(path, &retrieveAttrs, &retrieveBuf, sizeof(retrieveBuf), 0) != 0) {
				return errno;
			}
		}

		attrlist attrs;
		timespec times[3];

		memset(&attrs, 0, sizeof(attrs));
		attrs.commonattr = ATTR_CMN_CRTIME | ATTR_CMN_MODTIME | ATTR_CMN_ACCTIME;
		attrs.bitmapcount = ATTR_BIT_MAP_COUNT;

		if (flags & 1) {
			times[0].tv_sec = (time_t) (btime / 1000);
			times[0].tv_nsec = (long) ((btime % 1000) * 1000000);
		}
		else {
			times[0].tv_sec = 1; //retrieveBuf.crtime.tv_sec;
			times[0].tv_nsec = 0; //retrieveBuf.crtime.tv_nsec;
		}

		if (flags & 2) {
			times[1].tv_sec = (time_t) (mtime / 1000);
			times[1].tv_nsec = (long) ((mtime % 1000) * 1000000);
		}
		else {
			times[1].tv_sec = retrieveBuf.modtime.tv_sec;
			times[1].tv_nsec = retrieveBuf.modtime.tv_nsec;
		}

		if (flags & 4) {
			times[2].tv_sec = (time_t) (atime / 1000);
			times[2].tv_nsec = (long) ((atime % 1000) * 1000000);
		}
		else {
			times[2].tv_sec = retrieveBuf.acctime.tv_sec;
			times[2].tv_nsec = retrieveBuf.acctime.tv_nsec;
		}

		return setattrlist(path, &attrs, &times, 3 * sizeof(struct timespec), 0);
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
			FILE_FLAG_BACKUP_SEMANTICS,
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
			const Napi::Function &callback
		) : Napi::AsyncWorker(callback),
			pathHandleRef(Napi::ObjectReference::New(pathHandle, 1)),
			path(pathHandle.Data()),
			flags(flags),
			btime(btime),
			mtime(mtime),
			atime(atime) {}

		~UtimesWorker() {}

		void Execute() {
			result = set_utimes(path, flags, btime, mtime, atime);
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
		int result;
};

void utimes(const Napi::CallbackInfo& info) {
	if (info.Length() != 6 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber() || !info[4].IsNumber() || !info[5].IsFunction()) {
		throw Napi::Error::New(info.Env(), "bad arguments, expected: ("
			"buffer path, int flags, "
			"seconds btime, seconds mtime, seconds atime, "
			"function callback"
			")"
		);
	}

	Napi::Buffer<char> pathHandle = info[0].As<Napi::Buffer<char>>();
	const uint8_t flags = info[1].As<Napi::Number>().Uint32Value();
	const uint64_t btime = info[2].As<Napi::Number>().Int64Value();
	const uint64_t mtime = info[3].As<Napi::Number>().Int64Value();
	const uint64_t atime = info[4].As<Napi::Number>().Int64Value();

	Napi::Function callback = info[5].As<Napi::Function>();
	UtimesWorker *worker = new UtimesWorker(pathHandle, flags, btime, mtime, atime, callback);
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

// S.D.G.
