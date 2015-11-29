var WlanSwitch=require('../index'),
verb=require('verbo');


WlanSwitch.start().then(function(options){
  console.log(options)
}).catch(function(err){
  verb(err,'error','hostapd_switch')
})
