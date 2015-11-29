var WlanSwitch=require('../index'),
verb=require('verbo');


WlanSwitch.ap().then(function(options){
  verb(options,'hostapd_switch')
}).catch(function(err){
  verb(err,'error','hostapd_switch')
})
