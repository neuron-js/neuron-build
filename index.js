'use strict'

module.exports = build

var builder = require('neuron-module-builder')
var nj = require('neuron-json')
var fse = require('fs-extra')
var node_path = require('path')
var expand = require('fs-expand')
var fs = require('graceful-fs')
var async = require('async')
var mix = require('mix2')
var minimatch = require('minimatch')
var util = require('util')

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
        build.resources(cwd, dest, options, pkg, done, write)
      }
    ], function (err) {
      callback(err)
    })
  })
}


build.entries = function (cwd, dest, options, pkg, callback, write) {
  if (pkg.dist.length) {
    return build.dist(cwd, dest, pkg, callback, write)
  }

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


build.dist = function (cwd, dest, pkg, callback, write) {
  async.each(pkg.dist, function (dist) {
    var from = node_path.join(cwd, dist)
    var to = node_path.join(dest, pkg.version, dist)

    fs.readFile(from, function (err, content) {
      if (err) {
        return callback(err)
      }

      write(to, content.toString(), callback)
    })

  }, callback)
}


build.resources = function (cwd, dest, options, pkg, callback, write) {
  function get_output_dest (file) {
    return node_path.join(dest, pkg.version, file)
  }

  // Only build the first level of css files
  expand([
    '**',
    '!**/*.js'
  ], {
    cwd: cwd
  }, function (err, files) {
    if (err) {
      return callback(err)
    }

    files = files.concat(pkg.css)

    async.each(files, function (file, done) {
      var origin = node_path.join(cwd, file)
      var compiler = build._get_compiler(file, options)

      if (!compiler) {
        var output_dest = get_output_dest(file)
        try {
          fse.copySync(origin, output_dest)
        } catch (e) {
          return done(e)
        }

        return done(null)
        // return fse.copy(origin, output_dest, done)
      }

      fs.readFile(origin, function (err, content) {
        if (err) {
          return done(err)
        }

        var compiler_options = mix({
          filename: origin
        }, compiler.options, false)

        compiler.compiler(
          content.toString(),
          compiler_options,
          function (err, result) {
            if (err) {
              return done(err)
            }

            if (result.extname) {
              file = file.replace(/\.[^.]+$/, result.extname)
            }

            var output_dest = get_output_dest(file)
            write(output_dest, result.content, done)
          }
        )
      })
    }, function (err){
      if (err) {
        return callback(err[0])
      }

      callback(null)
    })
  })
}


build._get_compiler = function (path, options) {
  var compilers = options.compilers
  var found

  compilers.some(function (compiler) {
    if (compiler.test && compiler.test.test(path)) {
      found = compiler
      return true
    }
  })

  if (!found) {
    return
  }

  found.options = found.options || {}

  // Method to resolve relative paths
  found.options.resolve = options.resolve

  return found
}
