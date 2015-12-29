'use strict';

var expect = require('chai').expect;
var neuron_build = require('../');


describe("description", function(){
  it("description", function(done){
    neuron_build(
      '/Users/Kael/codes/red/fulishe/static_modules/app-qa', 
      '/Users/Kael/codes/red/fulishe/static_modules/app-qa2', 
      function(){
        console.log(arguments)
        done()
      }
    )
  });
});