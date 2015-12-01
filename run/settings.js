var WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch.settings({wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'}).then(function(options){
  verb(options,'info','hostapd_switch settings')
}).catch(function(err){
  verb(err,'error','hostapd_switch settings')
})
