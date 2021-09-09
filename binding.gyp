{
	"targets": [
		{
			"target_name": "utimes",
			"cflags!": [
				"-fno-exceptions"
			],
			"cflags_cc!": [
				"-fno-exceptions"
			],
			"xcode_settings": {
				"GCC_ENABLE_CPP_EXCEPTIONS": "YES",
				"CLANG_CXX_LIBRARY": "libc++",
				"MACOSX_DEPLOYMENT_TARGET": "10.7",
			},
			"msvs_settings": {
				"VCCLCompilerTool": {
					"ExceptionHandling": 1
				},
			},
			"sources": [
				"cpp/binding.cc"
			],
			"include_dirs": [
				"<!(node -p \"require('node-addon-api').include_dir\")"
			],
			"dependencies": [
				"<!(node -p \"require('node-addon-api').gyp\")"
			]
		},
		{
			"target_name": "copy",
			"cflags!": [
				"-fno-exceptions"
			],
			"cflags_cc!": [
				"-fno-exceptions"
			],
			"xcode_settings": {
				"GCC_ENABLE_CPP_EXCEPTIONS": "YES",
				"CLANG_CXX_LIBRARY": "libc++",
				"MACOSX_DEPLOYMENT_TARGET": "10.7",
			},
			"msvs_settings": {
				"VCCLCompilerTool": {
					"ExceptionHandling": 1
				},
			},
			"type": "none",
			"dependencies": [
				"<(module_name)"
			],
			"copies": [
				{
					'files': ['<(PRODUCT_DIR)/<(module_name).node'],
					'destination': '<(module_path)',
				}
			]
		}
	]
}
