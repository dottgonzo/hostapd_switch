import WlanSwitch from '../index';
const verb = require('verbo');

const conf = require('./conf.json')

conf.wpasupplicant_path=__dirname+'/wpa_supplicant.conf'


conf.redirect = 4000

const WS = new WlanSwitch(conf, true)
console.log(WS)

WS.client(true, true).then(function (options) {
    verb(options, 'info', 'hostapd_switch client')
}).catch(function (err) {
    verb(err, 'error', 'hostapd_switch client')
})
