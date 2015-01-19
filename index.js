var browserify = require('browserify')
  , to5ify = require('6to5ify')
  , envify = require('envify/custom')
  , uglifyify = require('uglifyify')
  , defaults = require('defaults')
  , path = require('path')
  , to5path = './node_modules/6to5ify/node_modules/6to5-core/'
  , production = process.env.NODE_ENV === 'production'

module.exports = exports = function(root, options) {
	options = setOptionDefaults(options)

	if(path.extname(root)) {
		//is a file
		return function* (next) {
			this.body = createBundle(root, options)
		}
	}

	//is a directory
	return function* (next) {
		if(!options.exts.test(this.path)) {
			return yield next
		}

		this.body = createBundle(root+this.path, options)
	}
}

function setOptionDefaults(options) {
	options = defaults(options, {
		  exts: ['js']
	})
	options.to5 = defaults(options.to5, {
		  runtime: true
		, polyfill: true
	})
	options.uglify = defaults(options.uglify, {
		sourcemap: !production
	})
	options.exts = extRegex(options.exts)
	options.vars = getVars()
	return options
}

function extRegex(exts) {
	var srcs = []
	exts.forEach(function(x) {
		if(x[0] != '.') x = '.'+x
		srcs.push('\\'+x+'$')
	})
	return new RegExp(srcs.join('|'), 'i')
}

function createBundle(path, options) {
	var b = browserify({ debug:!production })
	
	if(options.to5.runtime) b.add(to5path+'runtime.js')
	if(options.to5.polyfill) b.add(to5path+'polyfill.js')
	
	b.add(path)

	b.transform(to5ify.configure(options.to5))
	b.transform(envify(options.vars))
	b.transform(uglifyify, options.uglify)

	return b.bundle()
}

function getVars() {
	var vars = {}
	Object.keys(process.env).forEach(function(key) {
		vars[key] = process.env[key]
	})
	vars.SERVER = false
	vars.BROWSER = true
	vars._ = 'purge'
	return vars
}
