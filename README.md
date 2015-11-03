[![Build Status](https://travis-ci.org/neuron-js/neuron-build.svg?branch=master)](https://travis-ci.org/neuron-js/neuron-build)
<!-- optional npm version
[![NPM version](https://badge.fury.io/js/neuron-build.svg)](http://badge.fury.io/js/neuron-build)
-->
<!-- optional npm downloads
[![npm module downloads per month](http://img.shields.io/npm/dm/neuron-build.svg)](https://www.npmjs.org/package/neuron-build)
-->
<!-- optional dependency status
[![Dependency Status](https://david-dm.org/neuron-js/neuron-build.svg)](https://david-dm.org/neuron-js/neuron-build)
-->

# neuron-build

Neuron command to build a package.

## Install

```sh
$ npm install neuron-build --save
```

## Usage

```js
var build = require('neuron-build');
build(cwd, {
  root: '/path/to/workspace',
  dest: '/path/to/built'
}, callback)
```

## License

MIT
