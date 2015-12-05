var WlanSwitch=require('../index'),
verb=require('verbo');

var conf={
  interface:'wlan0',
  hostapd:{
    driver:'rtl871xdrv',
  ssid:'testap',
  wpa_passphrase:'testpass'
}
}
var WS=new WlanSwitch(conf,true)
console.log(WS)

WS.ap().then(function(options){
  verb(options,'info','hostapd_switch ap')
}).catch(function(err){
  verb(err,'error','hostapd_switch ap')
})
