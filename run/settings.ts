import WlanSwitch from '../index';
const verb = require('verbo');

const conf = require('./conf.json')

const WS=new WlanSwitch(conf,true)
console.log(WS)
