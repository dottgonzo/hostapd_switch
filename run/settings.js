var WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch.settings().then(function(options){
  verb(options,'info','hostapd_switch settings')
}).catch(function(err){
  verb(err,'error','hostapd_switch settings')
})
