var WlanSwitch=require('../index'),
verb=require('verbo');

WlanSwitch().then(function(options){
  console.log('options')

  console.log(options)
}).catch(function(err){
  console.log('err')

  verb(err,'error','hostapd_switch')
})
