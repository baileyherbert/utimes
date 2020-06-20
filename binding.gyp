{
	"targets": [
		{
			"target_name": "binding",
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
				"binding.cc"
			],
			"include_dirs": [
				"<!@(node -p \"require('node-addon-api').include\")"
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
				"binding"
			],
			"copies": [
				{
					'destination': '<(module_root_dir)',
					'files': [
						'<(module_root_dir)/build/Release/binding.node'
					]
				}
			]
		}
	]
}
