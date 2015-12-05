var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  test:false,
interface:'wlan0',
ssid:'testap',
wpa_passphrase:'testpass'
}
var WS=new WlanSwitch(conf)
console.log(WS)
