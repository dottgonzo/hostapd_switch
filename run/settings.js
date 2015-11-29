WlanSwitch=require('../index');

WlanSwitch.settings().then(function(options){
  verb(options,'info','hostapd_switch settings')
}).catch(function(err){
  verb(err,'error','hostapd_switch settings')
})
