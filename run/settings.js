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
var WS=new WlanSwitch(conf,true)
console.log(WS)
