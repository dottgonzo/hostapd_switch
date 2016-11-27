var assert    = require("chai").assert,
WlanSwitch=require('../index'),
verb=require('verbo');
var conf={
  interface:'wlan0',
  hostapd:{
    driver:'rtl871xdrv',
  ssid:'testap',
  wpa_passphrase:'testpass',
  test:true
},
dnsmasq:{
  test:true
}
}
var json=new WlanSwitch.default(conf)
console.log(json)
describe('Status Object', function() {
  describe('check json', function () {

    it('validate ', function(){

        assert.isObject(json, 'Status is an object');


    })
    it('validate interface', function(){
        assert.isString(json.config.interface);
    })
    it('validate dnsmasq', function(){
      assert.isObject(json.dnsmasq);
    })
    it('validate hostapd', function(){
      assert.isObject(json.dnsmasq);
    })
  });
});
