"use strict";
var index_1 = require('../index');
var verb = require('verbo');
var conf = require('./conf.json');
conf.redirect = 4000;
var WS = new index_1.default(conf, true);
console.log(WS);
WS.client(true, true).then(function (options) {
    verb(options, 'info', 'hostapd_switch client');
}).catch(function (err) {
    verb(err, 'error', 'hostapd_switch client');
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bi9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxzQkFBdUIsVUFBVSxDQUFDLENBQUE7QUFDbEMsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRTlCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUduQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtBQUVwQixJQUFNLEVBQUUsR0FBRyxJQUFJLGVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUVmLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE9BQU87SUFDeEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtBQUNsRCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO0lBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUE7QUFDL0MsQ0FBQyxDQUFDLENBQUEiLCJmaWxlIjoicnVuL2hvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgV2xhblN3aXRjaCBmcm9tICcuLi9pbmRleCc7XG5jb25zdCB2ZXJiID0gcmVxdWlyZSgndmVyYm8nKTtcblxuY29uc3QgY29uZiA9IHJlcXVpcmUoJy4vY29uZi5qc29uJylcblxuXG5jb25mLnJlZGlyZWN0ID0gNDAwMFxuXG5jb25zdCBXUyA9IG5ldyBXbGFuU3dpdGNoKGNvbmYsIHRydWUpXG5jb25zb2xlLmxvZyhXUylcblxuV1MuY2xpZW50KHRydWUsIHRydWUpLnRoZW4oZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2ZXJiKG9wdGlvbnMsICdpbmZvJywgJ2hvc3RhcGRfc3dpdGNoIGNsaWVudCcpXG59KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgdmVyYihlcnIsICdlcnJvcicsICdob3N0YXBkX3N3aXRjaCBjbGllbnQnKVxufSlcbiJdfQ==
