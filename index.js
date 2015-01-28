var fs = require('fs')
  , debug = require('debug')('kent-serve-browser')
  , browserify = require('browserify')
  , to5ify = require('6to5ify')
  , envify = require('envify/custom')
  , uglifyify = require('uglifyify')
  , defaults = require('defaults')
  , path = require('path')
  , to5path = __dirname+'/node_modules/6to5ify/node_modules/6to5-core/'
  , production = process.env.NODE_ENV === 'production'
  , _cache = {}
  , _pcache = {}

try {
	_cache = JSON.parse(fs.readFileSync(__dirname+'/.cache', 'utf8'))
	Object.keys(_cache).forEach(function(id) {
		var cache = _cache[id]
		  , stat = fs.statSync(cache.file)
		  , old = stat.mtime.getTime() - cache._cachetime > 0

		if(old) delete _cache[id]
	})
} catch(e) { console.log(e) }

module.exports = exports = function(root, options) {
	options = setOptionDefaults(options)

	if(path.extname(root)) {
		//is a file
		createBundle(root, options)
		
		return function* (next) {
			this.set('Content-Type', 'text/javascript')
			this.body = createBundle(root, options)
		}
	}

	//is a directory
	return function* (next) {
		if(!options.exts.test(this.path))
			return yield next
		
		this.set('Content-Type', 'text/javascript')
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
		, global:true
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
	if(_pcache[path]) return _pcache[path]

	var b = browserify({ 
		  debug: !production
		, cache: _cache
		, fullPaths: true
	})
	
	if(options.to5.runtime) b.add(to5path+'runtime.js')
	if(options.to5.polyfill) b.add(to5path+'polyfill.js')
	
	b.add(path)

	b.transform(to5ify.configure(options.to5), { global:true })
	b.transform(envify(options.vars), { global:true })
	b.transform(uglifyify, options.uglify)

	b.on('bundle', function(bundle) {
		var content = ''
		  , start = Date.now()

		debug('bundling...')

		bundle.on('data', function(data) {
			content += data
		})
		bundle.on('end', function() {
			_pcache[path] = content
			fs.writeFile(__dirname+'/.cache', JSON.stringify(_cache))
			debug('bundled '+(content.length/1024)+'kb in '+((Date.now()-start)/1000)+'s')
		})
	})

	b.on('dep', function(dep) {
		// don't cache json files
		if(/\.json$/.test(dep.file)) return
		
		_cache[dep.id] = dep
		dep._cachetime = Date.now()
	})

	return _pcache[path] = b.bundle()
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
