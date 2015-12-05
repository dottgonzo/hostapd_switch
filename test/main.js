var assert    = require("chai").assert,
WlanSwitch=require('../index'),
verb=require('verbo');
var config={
  test:false,
interface:'wlan0',
ssid:'testap',
wpa_passphrase:'testpass'
}
var json=new WlanSwitch(config)
console.log(json)
describe('Status Object', function() {
  describe('check json', function () {

    it('validate ', function(){

        assert.isObject(json, 'Status is an object');


    })
    it('validate interface', function(){
        assert.isString(json.interface);
    })
    it('validate dnsmasq', function(){
      assert.isObject(json.dnsmasq);
    })
  });
});
