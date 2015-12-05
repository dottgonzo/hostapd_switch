var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  test:false,
  driver:'rtl871xdrv',
interface:'wlan0',
ssid:'testap',
wpa_passphrase:'testpass'
}
var WS=new WlanSwitch(conf,true)
console.log(WS)

WS.ap().then(function(options){
  verb(options,'info','hostapd_switch ap')
}).catch(function(err){
  verb(err,'error','hostapd_switch ap')
})
