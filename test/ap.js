WlanSwitch=require('../index');

WlanSwitch.start().then(function(options){
  console.log(options)
})
