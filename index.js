'use strict';

module.exports = build;

var builder = require('neuron-builder');
var nj = require('neuron-json');
var fse = require('fs-extra');
var node_path = require('path');
var jade_compiler = require('neuron-jade-compiler');
var stylus_compiler = require('neuron-stylus-compiler');
var expand = require('fs-expand');
var fs = require('graceful-fs');
var async = require('async');


// @param {Object} options
function build (cwd, dest, callback) {
  nj.read(cwd, function (err, pkg) {
    async.parallel([
      function (done) {
        build.entries(cwd, dest, pkg, done);
      },

      function (done) {
        build.css(cwd, dest, pkg, done);
      }
    ], function (err) {
      callback(err);
    });
  });
}


build.entries = function (cwd, dest, pkg, callback) {
  var entries = pkg.entries
    .concat(pkg.main)
    .filter(function (entry) {
      return entry;
    });

  async.each(entries, function (entry, done) {
    var file = node_path.join(cwd, entry);
    builder(file, {
      pkg: pkg,
      cwd: cwd,
      allow_implicit_dependencies: true,
      compilers: [
        {
          test: '.jade',
          compiler: jade_compiler
        }
      ]
    }, function (err, content) {
      if (err) {
        return done(err);
      }

      var output_dest = node_path.join(dest, entry);
      fse.outputFile(output_dest, content, done);
    });

  }, callback);
};


build.css = function (cwd, dest, pkg, callback) {
  // Only build the first level of css files
  expand([
    '*.styl', 
    '*.css', 
    '**/*.png',
    '**/*.jpg',
    '**/*.gif'
  ], {
    cwd: cwd
  }, function (err, files) {
    if (err) {
      return callback(err);
    }

    var csses = files.concat(pkg.css);

    async.each(csses, function (css, done) {
      var extname = node_path.extname(css);
      var is_stylus = extname === '.styl';
      var origin = node_path.join(cwd, css);
      var output_dest = !is_stylus
        ? node_path.join(dest, css)
        : node_path.join(dest, css.replace(/\.styl$/, '.css'));

      if (!is_stylus) {
        return fse.copy(origin, output_dest, done);
      }

      fs.readFile(origin, function (err, content) {
        if (err) {
          return done(err);
        }

        stylus_compiler(content.toString(), {
          filename: origin
        }, function (err, result) {
          if (err) {
            return done(err);
          }

          fse.outputFile(output_dest, result.content, done);
        });
      });
    }, callback);

  });
};
