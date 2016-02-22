var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var WlanSwitch = require('../index');
var verb = require('verbo');
var conf = {
    interface: 'wlan0',
    hostapd: {
        driver: 'rtl871xdrv',
        ssid: 'testttap',
        wpa_passphrase: 'testpass'
    }
};
var WS = new WlanSwitch(conf, true);
console.log(WS);
WS.ap().then(function (options) {
    verb(options, 'info', 'hostapd_switch ap');
}).catch(function (err) {
    verb(err, 'error', 'hostapd_switch ap');
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bi9hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLElBQU8sVUFBVSxXQUFTLFVBQVUsQ0FBQyxDQUFDO0FBQ3RDLElBQUksSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUxQixJQUFJLElBQUksR0FBQztJQUNQLFNBQVMsRUFBQyxPQUFPO0lBQ2pCLE9BQU8sRUFBQztRQUNOLE1BQU0sRUFBQyxZQUFZO1FBQ3JCLElBQUksRUFBQyxVQUFVO1FBQ2YsY0FBYyxFQUFDLFVBQVU7S0FDMUI7Q0FDQSxDQUFBO0FBQ0QsSUFBSSxFQUFFLEdBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7QUFFZixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsT0FBTztJQUMzQixJQUFJLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsSUFBSSxDQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUN2QyxDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJydW4vYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgV2xhblN3aXRjaD1yZXF1aXJlKCcuLi9pbmRleCcpO1xubGV0IHZlcmI9cmVxdWlyZSgndmVyYm8nKTtcblxudmFyIGNvbmY9e1xuICBpbnRlcmZhY2U6J3dsYW4wJyxcbiAgaG9zdGFwZDp7XG4gICAgZHJpdmVyOidydGw4NzF4ZHJ2JyxcbiAgc3NpZDondGVzdHR0YXAnLFxuICB3cGFfcGFzc3BocmFzZTondGVzdHBhc3MnXG59XG59XG5sZXQgV1M9bmV3IFdsYW5Td2l0Y2goY29uZix0cnVlKVxuY29uc29sZS5sb2coV1MpXG5cbldTLmFwKCkudGhlbihmdW5jdGlvbihvcHRpb25zKXtcbiAgdmVyYihvcHRpb25zLCdpbmZvJywnaG9zdGFwZF9zd2l0Y2ggYXAnKVxufSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgdmVyYihlcnIsJ2Vycm9yJywnaG9zdGFwZF9zd2l0Y2ggYXAnKVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
