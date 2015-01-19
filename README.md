# kent-serve-browser

middleware for kent.js. serves js bundles to the browser.

```javascript
var serve = require('kent-serve-browser')
app.get('/index.js', serve(__dirname + 'index.js'))
```

## options

### exts
array of extensions that should be bundled. default: `['js']`

### uglify
object to pass to [uglify](https://github.com/mishoo/UglifyJS2).

### to5
object to pass to [6to5](https://github.com/6to5/6to5).  This object can also have two non-standard keys that default to true: `runtime` and `polyfill`.  When true, these include the 6to5 runtime and polyfill scripts, respectively.

