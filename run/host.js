var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  interface:'wlan0',
  redirect:4000,
  hostapd:{
    driver:'rtl871xdrv',
  ssid:'testttap',
  wpa_passphrase:'testpass'
}
}
var WS=new WlanSwitch(conf,true)
console.log(WS)

WS.host().then(function(options){
  verb(options,'info','hostapd_switch host')
}).catch(function(err){
  verb(err,'error','hostapd_switch host')
})
