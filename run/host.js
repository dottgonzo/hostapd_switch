var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  interface:'wlan0',
  hostapd:{
    driver:'rtl871xdrv',
  ssid:'testttap',
  wpa_passphrase:'testpass'
}
}
var WS=new WlanSwitch(conf)
console.log(WS)

WS.host().then(function(options){
  verb(options,'info','hostapd_switch host')
}).catch(function(err){
  verb(err,'error','hostapd_switch host')
})
