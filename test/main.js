var expect    = require("chai").expect,
WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch().then(function(options){
  console.log(options)
})
