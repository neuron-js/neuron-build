'use strict'

module.exports = build

var builder = require('neuron-module-builder')
var nj = require('neuron-json')
var fse = require('fs-extra')
var node_path = require('path')
var expand = require('fs-expand')
var fs = require('graceful-fs')
var async = require('async')
var stylus_compiler = require('neuron-stylus-compiler')
var mix = require('mix2')


function default_write (file, content, callback) {
  fse.outputFile(file, content, callback)
}


// @param {Object} options
function build (cwd, dest, options, callback, write) {
  write = write || default_write

  nj.read(cwd, function (err, pkg) {
    if (err) {
      return callback(err)
    }

    async.parallel([
      function (done) {
        build.entries(cwd, dest, options, pkg, done, write)
      },

      function (done) {
        build.css(cwd, dest, options, pkg, done, write)
      }
    ], function (err) {
      callback(err)
    })
  })
}


build.entries = function (cwd, dest, options, pkg, callback, write) {
  var entries = pkg.entries
    .concat(pkg.main)
    .filter(function (entry) {
      return entry
    })

  async.each(entries, function (entry, done) {
    var file = node_path.join(cwd, entry)
    builder(file, {
      pkg: pkg,
      cwd: cwd,
      allow_implicit_dependencies: true,
      compilers: options.compilers || [],
      babel: options.babel

    }, function (err, content) {
      if (err) {
        return done(err)
      }

      var basename = entry === pkg.main
        ? pkg.name + '.js'
        : entry

      var output_dest = node_path.join(dest, pkg.version, basename)
      write(output_dest, content, done)
    })

  }, callback)
}


build.css = function (cwd, dest, options, pkg, callback, write) {
  // Only build the first level of css files
  expand([
    '**/*.styl',
    '**/*.css',
    '**/*.png',
    '**/*.jpg',
    '**/*.gif',
    '**/*.html'
  ], {
    cwd: cwd
  }, function (err, files) {
    if (err) {
      return callback(err)
    }

    var csses = files.concat(pkg.css)
    var stylus_compiler = build._get_stylus_compiler(options)

    async.each(csses, function (css, done) {
      var extname = node_path.extname(css)
      var is_stylus = extname === '.styl'
      var origin = node_path.join(cwd, css)
      var output_dest = !is_stylus
        ? node_path.join(dest, pkg.version, css)
        : node_path.join(dest, pkg.version, css.replace(/\.styl$/, '.css'))

      if (!is_stylus) {
        return fse.copy(origin, output_dest, done)
      }

      fs.readFile(origin, function (err, content) {
        if (err) {
          return done(err)
        }

        var stylus_options = mix({
          filename: origin
        }, stylus_compiler.options, false)

        stylus_compiler.compiler(
          content.toString(),
          stylus_options,
            function (err, result) {
            if (err) {
              return done(err)
            }

            write(output_dest, result.content, done)
          }
        )
      })
    }, callback)
  })
}


build._get_stylus_compiler = function (options) {
  var compilers = options.compilers || []
  var found
  compilers.some(function (compiler) {
    if (compiler.test && compiler.test.test('.styl')) {
      found = compiler
      return true
    }
  })

  found = found || {
    compiler: stylus_compiler
  }

  found.options = found.options || {}

  return found
}
