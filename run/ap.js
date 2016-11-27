"use strict";
var index_1 = require('../index');
var verb = require('verbo');
var conf = require('./conf.json');
var WS = new index_1.default(conf, true);
console.log(WS);
WS.ap().then(function (options) {
    verb(options, 'info', 'hostapd_switch ap');
}).catch(function (err) {
    verb(err, 'error', 'hostapd_switch ap');
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bi9hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsc0JBQXVCLFVBQVUsQ0FBQyxDQUFBO0FBQ2xDLElBQU0sSUFBSSxHQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUU1QixJQUFNLElBQUksR0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7QUFFakMsSUFBTSxFQUFFLEdBQUMsSUFBSSxlQUFVLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7QUFFZixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsT0FBTztJQUMzQixJQUFJLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7SUFDbkIsSUFBSSxDQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUN2QyxDQUFDLENBQUMsQ0FBQSIsImZpbGUiOiJydW4vYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgV2xhblN3aXRjaCBmcm9tICcuLi9pbmRleCc7XG5jb25zdCB2ZXJiPXJlcXVpcmUoJ3ZlcmJvJyk7XG5cbmNvbnN0IGNvbmY9cmVxdWlyZSgnLi9jb25mLmpzb24nKVxuXG5jb25zdCBXUz1uZXcgV2xhblN3aXRjaChjb25mLHRydWUpXG5jb25zb2xlLmxvZyhXUylcblxuV1MuYXAoKS50aGVuKGZ1bmN0aW9uKG9wdGlvbnMpe1xuICB2ZXJiKG9wdGlvbnMsJ2luZm8nLCdob3N0YXBkX3N3aXRjaCBhcCcpXG59KS5jYXRjaChmdW5jdGlvbihlcnIpe1xuICB2ZXJiKGVyciwnZXJyb3InLCdob3N0YXBkX3N3aXRjaCBhcCcpXG59KVxuIl19
