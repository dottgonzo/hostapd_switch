var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  test:false,
interface:'wlan0',
ssid:'testap',
wpa_passphrase:'testpass'
}
var WS=new WlanSwitch(conf,true)
console.log(WS)

WS.host().then(function(options){
  verb(options,'info','hostapd_switch host')
}).catch(function(err){
  verb(err,'error','hostapd_switch host')
})
