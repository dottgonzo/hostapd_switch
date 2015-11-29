var WlanSwitch=require('../index'),
verb=require('verbo');


WlanSwitch.ap().then(function(options){
  verb(options,'info','hostapd_switch ap')
}).catch(function(err){
  verb(err,'error','hostapd_switch ap')
})
