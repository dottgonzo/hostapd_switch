import WlanSwitch from '../index';
const verb = require('verbo');

const conf = require('./conf.json')
conf.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'

const WS=new WlanSwitch(conf,true)
console.log(WS)
