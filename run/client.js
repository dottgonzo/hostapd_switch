var WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch.client({wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'},true,true).then(function(options){
  verb(options,'info','hostapd_switch client')
}).catch(function(err){
  verb(err,'error','hostapd_switch client')
})
