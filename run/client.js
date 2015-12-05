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

WS.client().then(function(options){
  verb(options,'info','hostapd_switch client')
}).catch(function(err){
  verb(err,'error','hostapd_switch client')
})
