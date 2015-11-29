WlanSwitch=require('../index');

WlanSwitch.configure().then(function(options){
  console.log(options)
})
