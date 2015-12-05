var WlanSwitch=require('../index'),
verb=require('verbo');

var config={
wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'
}

var WS=WlanSwitch(config)

WS.ap().then(function(options){
  verb(options,'info','hostapd_switch ap')
}).catch(function(err){
  verb(err,'error','hostapd_switch ap')
})
