var WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch.client().then(function(options){
  verb(options,'info','hostapd_switch client')
}).catch(function(err){
  verb(err,'error','hostapd_switch client')
})
