var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Promise = require("bluebird");
var pathExists = require("path-exists");
var dnsmasqconf = require("dnsmasq-conf");
var merge = require("json-add");
var testinternet = require('promise-test-connection');
var wpamanager = require('wpasupplicant-manager');
var netw = require("netw");
var verb = require('verbo');
var exec = require('promised-exec');
var hostapdconf = require("hostapdjs");
function testconn(d, testint) {
    return new Promise(function (resolve, reject) {
        netw().then(function (n) {
            var dev = false;
            var netw;
            var ip = false;
            for (var ns = 0; ns < n.length; ns++) {
                if (n[ns].interface == d) {
                    dev = d;
                    if (n[ns].ip) {
                        ip = n[ns].ip;
                    }
                }
            }
            if (!dev) {
                reject('no interface');
            }
            else if (!ip) {
                reject(dev + ' can\'t get an ip address');
            }
            else {
                if (testint) {
                    testinternet().then(function (a) {
                        if (a.ip) {
                            resolve(true);
                        }
                        else {
                            resolve(true);
                        }
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    console.log("warn no internet");
                    resolve(true);
                }
            }
        }).catch(function (err) {
            reject('netw' + err);
        });
    });
}
;
;
;
;
;
;
var config = {
    interface: "wlan0",
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
    redirect: true,
    hostapd: { interface: "wlan0", wpa_passphrase: false, ssid: "hapd111", fileconf: "/etc/default/hostapd" },
    dnsmasq: { interface: "wlan0" },
    init: false
};
;
module.exports = (function (_super) {
    __extends(HostapdSwitch, _super);
    function HostapdSwitch(options, init) {
        merge(config, options);
        if (!pathExists.sync('/etc/default/hostapd')) {
            throw Error('no default conf file was founded for hostapd');
        }
        if (!config.hostapd.ssid) {
            throw Error('No ssid was provided');
        }
        if (!config.hostapd.wpa_passphrase) {
            throw Error('No wpa_passphrase was provided');
        }
        this.config = config;
        _super.call(this, config.wpasupplicant_path);
        this.dnsmasq = new dnsmasqconf(config.dnsmasq);
        if (init) {
            hostapdconf(config.hostapd).then(function () {
                console.log('hostapd is now configured');
            });
        }
        ;
    }
    ;
    HostapdSwitch.prototype.host = function (e) {
        this.mode = "host";
        var dnsmasq = this.dnsmasq;
        var hostIp = dnsmasq.hostIp;
        var cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && sleep 5';
        return new Promise(function (resolve, reject) {
            dnsmasq.setmode('host').then(function () {
                exec(cmd).then(function () {
                    exec('iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination ' + hostIp + ':80 && iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination ' + hostIp + ':80').then(function () {
                        resolve(true);
                    }).catch(function (err) {
                        verb(err, 'error', 'hostapd_switch ipfilter host switch');
                    });
                }).catch(function (err) {
                    verb(err, 'error', 'hostapd_switch executing host switch');
                });
            }).catch(function (err) {
                verb(err, 'error', 'hostapd_switch executing dnsmasq host switch');
            });
        });
    };
    ;
    HostapdSwitch.prototype.ap = function (e) {
        this.mode = "ap";
        var dnsmasq = this.dnsmasq;
        var hostIp = dnsmasq.hostIp;
        var cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up  && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';
        return new Promise(function (resolve, reject) {
            dnsmasq.ap().then(function () {
                exec(cmd).then(function () {
                    resolve(true);
                }).catch(function (err) {
                    verb(err, 'error', 'hostapd_switch executing ap switch');
                });
            }).catch(function (err) {
                verb(err, 'error', 'hostapd_switch executing dnsmasq before ap switch');
            });
        });
    };
    ;
    HostapdSwitch.prototype.client = function (testnetw, testint) {
        this.mode = "client";
        var dev = this.config.interface;
        var cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' -D wext && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';
        return new Promise(function (resolve, reject) {
            exec(cmd).then(function () {
                if (testnetw) {
                    testconn(dev, testint).then(function (answer) {
                        resolve(answer);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    resolve(true);
                }
            }).catch(function (err) {
                verb(err, 'warn', 'hostapd_switch exec');
                if (testnetw) {
                    testconn(dev, testint).then(function (answer) {
                        resolve(answer);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    resolve(true);
                }
            });
        });
    };
    ;
    return HostapdSwitch;
})(wpamanager);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbInRlc3Rjb25uIiwiY29uc3RydWN0b3IiLCJob3N0IiwiYXAiLCJjbGllbnQiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQ0EsSUFBWSxPQUFPLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDcEMsSUFBWSxVQUFVLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFDMUMsSUFBWSxXQUFXLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDNUMsSUFBTyxLQUFLLFdBQVcsVUFBVSxDQUFDLENBQUM7QUFDbkMsSUFBTyxZQUFZLFdBQVcseUJBQXlCLENBQUMsQ0FBQztBQUN6RCxJQUFPLFVBQVUsV0FBVyx1QkFBdUIsQ0FBQyxDQUFDO0FBRXJELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQWtCdkMsa0JBQWtCLENBQVMsRUFBRSxPQUFpQjtJQUUxQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsT0FBT0EsQ0FBVUEsVUFBU0EsT0FBT0EsRUFBRUEsTUFBTUE7UUFDaEQsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBVztZQUM1QixJQUFJLEdBQUcsR0FBUSxLQUFLLENBQUM7WUFDVCxJQUFJLElBQWEsQ0FBQztZQUM5QixJQUFJLEVBQUUsR0FBUSxLQUFLLENBQUM7WUFJcEIsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUd2QixHQUFHLEdBQUcsQ0FBQyxDQUFDO29CQUNSLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNYLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO29CQUNqQixDQUFDO2dCQUlMLENBQUM7WUFDTCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDYixNQUFNLENBQUMsR0FBRyxHQUFHLDJCQUEyQixDQUFDLENBQUM7WUFHOUMsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUdKLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ1YsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBZTt3QkFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQixDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEIsQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO3dCQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hCLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xCLENBQUM7WUFDTCxDQUFDO1FBRUwsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsR0FBRztZQUNqQixNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDQSxDQUFBQTtBQUVOQSxDQUFDQTtBQU9BLENBQUM7QUFPRCxDQUFDO0FBSUQsQ0FBQztBQUlELENBQUM7QUFRRCxDQUFDO0FBU0QsQ0FBQztBQUdGLElBQUksTUFBTSxHQUFlO0lBQ3JCLFNBQVMsRUFBRSxPQUFPO0lBQ2xCLGtCQUFrQixFQUFFLHlDQUF5QztJQUM3RCxRQUFRLEVBQUUsSUFBSTtJQUNkLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBQyxzQkFBc0IsRUFBRTtJQUN4RyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO0lBQy9CLElBQUksRUFBRSxLQUFLO0NBQ2QsQ0FBQztBQU1ELENBQUM7QUFzQ0YsaUJBQVM7SUFBNEIsaUNBQVU7SUFJM0MsdUJBQVksT0FBa0IsRUFBRSxJQUFjO1FBQzFDQyxLQUFLQSxDQUFDQSxNQUFNQSxFQUFFQSxPQUFPQSxDQUFDQSxDQUFBQTtRQUV0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUMzQ0EsTUFBTUEsS0FBS0EsQ0FBQ0EsOENBQThDQSxDQUFDQSxDQUFBQTtRQUMvREEsQ0FBQ0E7UUFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDdkJBLE1BQU1BLEtBQUtBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsQ0FBQUE7UUFDdkNBLENBQUNBO1FBQ0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pDQSxNQUFNQSxLQUFLQSxDQUFDQSxnQ0FBZ0NBLENBQUNBLENBQUFBO1FBQ2pEQSxDQUFDQTtRQUNEQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUM3QkEsa0JBQU1BLE1BQU1BLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQUE7UUFDeEJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLElBQUlBLFdBQVdBLENBQUNBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1FBRS9DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNQQSxXQUFXQSxDQUFDQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQzVDLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFDUEEsQ0FBQ0E7UUFBQUEsQ0FBQ0E7SUFFTkEsQ0FBQ0E7O0lBRUQsNEJBQUksR0FBSixVQUFLLENBQU87UUFDUkMsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBQ0EsTUFBTUEsQ0FBQ0E7UUFDakJBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBO1FBQzNCQSxJQUFJQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxNQUFNQSxDQUFDQTtRQUM1QkEsSUFBSUEsR0FBR0EsR0FBR0Esa0NBQWtDQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSwyRUFBMkVBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLEdBQUdBLHNDQUFzQ0EsQ0FBQ0E7UUFDbk9BLE1BQU1BLENBQUNBLElBQUlBLE9BQU9BLENBQVVBLFVBQVNBLE9BQU9BLEVBQUVBLE1BQU1BO1lBQ2hELE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUV6QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksQ0FBQywyRUFBMkUsR0FBRyxNQUFNLEdBQUcsbUZBQW1GLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDbk0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNqQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO3dCQUNqQixJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxxQ0FBcUMsQ0FBQyxDQUFBO29CQUM3RCxDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO29CQUNqQixJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxzQ0FBc0MsQ0FBQyxDQUFBO2dCQUM5RCxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7Z0JBQ2pCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLDhDQUE4QyxDQUFDLENBQUE7WUFDdEUsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUNBLENBQUFBO0lBQ05BLENBQUNBOztJQUdELDBCQUFFLEdBQUYsVUFBRyxDQUFPO1FBQ0VDLElBQUlBLENBQUNBLElBQUlBLEdBQUNBLElBQUlBLENBQUNBO1FBQ3ZCQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUMzQkEsSUFBSUEsTUFBTUEsR0FBR0EsT0FBT0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7UUFDNUJBLElBQUlBLEdBQUdBLEdBQUdBLGtDQUFrQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsR0FBR0EsNEVBQTRFQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxHQUFHQSxHQUFHQSxHQUFHQSxNQUFNQSxHQUFHQSxvS0FBb0tBLENBQUFBO1FBQ2pXQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFVQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtZQUNoRCxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO29CQUNqQixJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxvQ0FBb0MsQ0FBQyxDQUFBO2dCQUM1RCxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7Z0JBQ2pCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLG1EQUFtRCxDQUFDLENBQUE7WUFDM0UsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUNBLENBQUFBO0lBQ05BLENBQUNBOztJQUVELDhCQUFNLEdBQU4sVUFBTyxRQUFrQixFQUFFLE9BQWlCO1FBQ2hDQyxJQUFJQSxDQUFDQSxJQUFJQSxHQUFDQSxRQUFRQSxDQUFDQTtRQUMzQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7UUFDaENBLElBQUlBLEdBQUdBLEdBQUdBLFdBQVdBLEdBQUdBLEdBQUdBLEdBQUdBLHlEQUF5REEsR0FBR0EsR0FBR0EsR0FBR0EseUVBQXlFQSxHQUFHQSxHQUFHQSxHQUFHQSw4QkFBOEJBLEdBQUdBLEdBQUdBLEdBQUdBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLGtCQUFrQkEsR0FBR0EsdUJBQXVCQSxHQUFHQSxHQUFHQSxHQUFHQSwySUFBMklBLENBQUNBO1FBRS9hQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFVQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtZQUt4QyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNYLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ1gsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO3dCQUN2QyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ25CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7d0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZixDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7Z0JBQ2pCLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixDQUFDLENBQUE7Z0JBQ3hDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ1gsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO3dCQUN2QyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ25CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7d0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZixDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFBO1FBR2QsQ0FBQyxDQUFDQSxDQUFBQTtJQUVOQSxDQUFDQTs7SUFJTCxvQkFBQztBQUFELENBOUdTLEFBOEdSLEVBOUdvQyxVQUFVLENBOEc5QyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgcGF0aEV4aXN0cyBmcm9tIFwicGF0aC1leGlzdHNcIjtcbmltcG9ydCAqIGFzIGRuc21hc3Fjb25mIGZyb20gXCJkbnNtYXNxLWNvbmZcIjtcbmltcG9ydCBtZXJnZSA9IHJlcXVpcmUoXCJqc29uLWFkZFwiKTtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgPSByZXF1aXJlKCdwcm9taXNlLXRlc3QtY29ubmVjdGlvbicpO1xuaW1wb3J0IHdwYW1hbmFnZXIgPSByZXF1aXJlKCd3cGFzdXBwbGljYW50LW1hbmFnZXInKTtcblxubGV0IG5ldHcgPSByZXF1aXJlKFwibmV0d1wiKTtcbmxldCB2ZXJiID0gcmVxdWlyZSgndmVyYm8nKTtcbmxldCBleGVjID0gcmVxdWlyZSgncHJvbWlzZWQtZXhlYycpO1xubGV0IGhvc3RhcGRjb25mID0gcmVxdWlyZShcImhvc3RhcGRqc1wiKTtcbmludGVyZmFjZSBTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTmV0d29yayB7XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuXG5mdW5jdGlvbiB0ZXN0Y29ubihkOiBzdHJpbmcsIHRlc3RpbnQ/OiBib29sZWFuKSB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uKG46TmV0d29ya1tdKSB7XG4gICAgICAgICAgICBsZXQgZGV2OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXR3OiBOZXR3b3JrO1xuICAgICAgICAgICAgbGV0IGlwOiBhbnkgPSBmYWxzZTtcblxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAobGV0IG5zID0gMDsgbnMgPCBuLmxlbmd0aDsgbnMrKykge1xuICAgICAgICAgICAgICAgIGlmIChuW25zXS5pbnRlcmZhY2UgPT0gZCkge1xuXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkZXYgPSBkO1xuICAgICAgICAgICAgICAgICAgICBpZiAobltuc10uaXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlwID0gbltuc10uaXBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgIGlmIChuLm5ldHdvcmtzW25zXS5nYXRld2F5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgZ3cgPSBuLm5ldHdvcmtzW25zXS5nYXRld2F5XG4gICAgICAgICAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRldikge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gaW50ZXJmYWNlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFpcCkge1xuICAgICAgICAgICAgICAgIHJlamVjdChkZXYgKyAnIGNhblxcJ3QgZ2V0IGFuIGlwIGFkZHJlc3MnKTtcbiAgICAgICAgICAgICAgICAvLyAgfSBlbHNlIGlmICghZ3cpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KGRldiArICcgaGFzIG5vIGdhdGV3YXknKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0ZXN0aW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RpbnRlcm5ldCgpLnRoZW4oZnVuY3Rpb24oYTogeyBpcD86IGFueSB9KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS5pcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3YXJuIG5vIGludGVybmV0XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdCgnbmV0dycgKyBlcnIpO1xuICAgICAgICB9KVxuICAgIH0pXG5cbn1cblxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcbiAgICAgICAgZmlsZWNvbmY6c3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElIb3N0YXBkQ2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkPzogc3RyaW5nO1xuICAgIGZpbGVjb25mPzpzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U/OnN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSURuc21hc3FDZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElDbGFzc09wdCB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbiAgICBob3N0YXBkPzogSUhvc3RhcGRDZjtcbiAgICByZWRpcmVjdD86IGJvb2xlYW47XG4gICAgZG5zbWFzcT86IElEbnNtYXNxQ2Y7XG59O1xuXG5pbnRlcmZhY2UgSUNsYXNzQ29uZiB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBzdHJpbmc7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgZG5zbWFzcTogSURuc21hc3E7XG4gICAgaW5pdDogYm9vbGVhbjtcbiAgICByZWRpcmVjdDogYm9vbGVhbjtcbn07XG5cblxubGV0IGNvbmZpZzogSUNsYXNzQ29uZiA9IHtcbiAgICBpbnRlcmZhY2U6IFwid2xhbjBcIixcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IFwiL2V0Yy93cGFfc3VwcGxpY2FudC93cGFfc3VwcGxpY2FudC5jb25mXCIsXG4gICAgcmVkaXJlY3Q6IHRydWUsXG4gICAgaG9zdGFwZDogeyBpbnRlcmZhY2U6IFwid2xhbjBcIiwgd3BhX3Bhc3NwaHJhc2U6IGZhbHNlLCBzc2lkOiBcImhhcGQxMTFcIiwgZmlsZWNvbmY6XCIvZXRjL2RlZmF1bHQvaG9zdGFwZFwiIH0sXG4gICAgZG5zbWFzcTogeyBpbnRlcmZhY2U6IFwid2xhbjBcIiB9LFxuICAgIGluaXQ6IGZhbHNlXG59O1xuXG5pbnRlcmZhY2UgSURuc01vZGVzIHtcbiAgICBhcDogSURuc01vZGU7XG4gICAgbGluazogSURuc01vZGU7XG4gICAgaG9zdDogSURuc01vZGVcbn07XG5cbmludGVyZmFjZSBJRG5zTW9kZSB7XG4gICAgbm9yZXNvbHY6IGJvb2xlYW4sXG4gICAgZG5zOiBbc3RyaW5nXSxcbiAgICBkaGNwOiB7XG4gICAgICAgIHN0b3A6IG51bWJlcjtcbiAgICAgICAgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgbGVhc2U6IHN0cmluZztcbiAgICB9O1xuICAgIGhvc3RJcDogc3RyaW5nLFxuICAgIHRlc3Q6IGJvb2xlYW4sXG4gICAgaW50ZXJmYWNlOiBhbnksXG4gICAgYWRkcmVzcz86IHN0cmluZ1xufVxuXG5cblxuaW50ZXJmYWNlIElEbnMge1xuICAgICAgICBtb2RlczogSURuc01vZGVzO1xuICAgIG1vZGU/OiBzdHJpbmc7XG4gICAgcGF0aDpzdHJpbmc7XG4gICAgICAgIGludGVyZmFjZTogYW55O1xuICAgIHRlc3Q6IGJvb2xlYW47XG4gICAgZGhjcDoge1xuICAgICAgICBzdG9wOiBudW1iZXI7XG4gICAgICAgIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIGxlYXNlOiBzdHJpbmc7XG4gICAgfTtcbiAgICBkbnM6IFtzdHJpbmddO1xuICAgIGhvc3RJcDogc3RyaW5nO1xuICAgIGFwOkZ1bmN0aW9uO1xuICAgIGhvc3Q6RnVuY3Rpb247XG4gICAgbGluazpGdW5jdGlvbjtcbiAgICBzZXRtb2RlKHN0cmluZyk7XG59XG5cblxuZXhwb3J0ID0gY2xhc3MgSG9zdGFwZFN3aXRjaCBleHRlbmRzIHdwYW1hbmFnZXIge1xuICAgIGNvbmZpZzogSUNsYXNzQ29uZjtcbiAgICBkbnNtYXNxOiBJRG5zO1xuICAgIG1vZGU6c3RyaW5nO1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IElDbGFzc09wdCwgaW5pdD86IGJvb2xlYW4pIHtcbiAgICAgICAgbWVyZ2UoY29uZmlnLCBvcHRpb25zKVxuXG4gICAgICAgIGlmICghcGF0aEV4aXN0cy5zeW5jKCcvZXRjL2RlZmF1bHQvaG9zdGFwZCcpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gZGVmYXVsdCBjb25mIGZpbGUgd2FzIGZvdW5kZWQgZm9yIGhvc3RhcGQnKVxuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmhvc3RhcGQuc3NpZCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ05vIHNzaWQgd2FzIHByb3ZpZGVkJylcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbmZpZy5ob3N0YXBkLndwYV9wYXNzcGhyYXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTm8gd3BhX3Bhc3NwaHJhc2Ugd2FzIHByb3ZpZGVkJylcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbnN1cGVyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG4gICAgICAgIHRoaXMuZG5zbWFzcSA9IG5ldyBkbnNtYXNxY29uZihjb25maWcuZG5zbWFzcSk7XG5cbiAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgIGhvc3RhcGRjb25mKGNvbmZpZy5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdob3N0YXBkIGlzIG5vdyBjb25maWd1cmVkJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfTtcblxuICAgIGhvc3QoZT86IGFueSkge1xuICAgICAgICB0aGlzLm1vZGU9XCJob3N0XCI7XG4gICAgICAgIGxldCBkbnNtYXNxID0gdGhpcy5kbnNtYXNxO1xuICAgICAgICBsZXQgaG9zdElwID0gZG5zbWFzcS5ob3N0SXA7XG4gICAgICAgIGxldCBjbWQgPSAncGtpbGwgd3BhX3N1cHBsaWNhbnQgOyBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyB1cCAmJiBzeXN0ZW1jdGwgcmVzdGFydCBob3N0YXBkIDsgc3lzdGVtY3RsIHJlc3RhcnQgZG5zbWFzcSAmJiBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyAnICsgaG9zdElwICsgJyBuZXRtYXNrIDI1NS4yNTUuMjU1LjAgdXAgJiYgc2xlZXAgNSc7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGRuc21hc3Euc2V0bW9kZSgnaG9zdCcpLnRoZW4oZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhlYygnaXB0YWJsZXMgLXQgbmF0IC1BIFBSRVJPVVRJTkcgLXAgdGNwIC0tZHBvcnQgODAgLWogRE5BVCAtLXRvLWRlc3RpbmF0aW9uICcgKyBob3N0SXAgKyAnOjgwICYmIGlwdGFibGVzIC10IG5hdCAtQSBQUkVST1VUSU5HIC1wIHRjcCAtLWRwb3J0IDQ0MyAtaiBETkFUIC0tdG8tZGVzdGluYXRpb24gJyArIGhvc3RJcCArICc6ODAnKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggaXBmaWx0ZXIgaG9zdCBzd2l0Y2gnKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBob3N0IHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggZXhlY3V0aW5nIGRuc21hc3EgaG9zdCBzd2l0Y2gnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9O1xuXG5cbiAgICBhcChlPzogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlPVwiYXBcIjtcbiAgICAgICAgbGV0IGRuc21hc3EgPSB0aGlzLmRuc21hc3E7XG4gICAgICAgIGxldCBob3N0SXAgPSBkbnNtYXNxLmhvc3RJcDtcbiAgICAgICAgbGV0IGNtZCA9ICdwa2lsbCB3cGFfc3VwcGxpY2FudCA7IGlmY29uZmlnICcgKyB0aGlzLmNvbmZpZy5pbnRlcmZhY2UgKyAnIHVwICAmJiBzeXN0ZW1jdGwgcmVzdGFydCBob3N0YXBkIDsgc3lzdGVtY3RsIHJlc3RhcnQgZG5zbWFzcSAmJiBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyAnICsgaG9zdElwICsgJyBuZXRtYXNrIDI1NS4yNTUuMjU1LjAgdXAgJiYgZm9yIGkgaW4gJCggaXB0YWJsZXMgLXQgbmF0IC0tbGluZS1udW1iZXJzIC1MIHwgZ3JlcCBeWzAtOV0gfCBhd2sgXFwneyBwcmludCAkMSB9XFwnIHwgdGFjICk7IGRvIGlwdGFibGVzIC10IG5hdCAtRCBQUkVST1VUSU5HICRpOyBkb25lJ1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBkbnNtYXNxLmFwKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBhcCBzd2l0Y2gnKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBkbnNtYXNxIGJlZm9yZSBhcCBzd2l0Y2gnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgY2xpZW50KHRlc3RuZXR3PzogYm9vbGVhbiwgdGVzdGludD86IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGU9XCJjbGllbnRcIjtcbiAgICAgICAgbGV0IGRldiA9IHRoaXMuY29uZmlnLmludGVyZmFjZTtcbiAgICAgICAgbGV0IGNtZCA9ICdpZmNvbmZpZyAnICsgZGV2ICsgJyBkb3duICYmIHNsZWVwIDIgOyBwa2lsbCB3cGFfc3VwcGxpY2FudCA7ICBkaGNsaWVudCAtciAnICsgZGV2ICsgJyA7IHN5c3RlbWN0bCBzdG9wIGhvc3RhcGQgOyBzeXN0ZW1jdGwgc3RvcCBkbnNtYXNxIDsgc2xlZXAgMjsgaWZjb25maWcgJyArIGRldiArICcgdXAgJiYgd3BhX3N1cHBsaWNhbnQgLUIgLWkgJyArIGRldiArICcgLWMgJyArIHRoaXMuY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCArICcgLUQgd2V4dCAmJiBkaGNsaWVudCAnICsgZGV2ICsgJyAmJiBmb3IgaSBpbiAkKCBpcHRhYmxlcyAtdCBuYXQgLS1saW5lLW51bWJlcnMgLUwgfCBncmVwIF5bMC05XSB8IGF3ayBcXCd7IHByaW50ICQxIH1cXCcgfCB0YWMgKTsgZG8gaXB0YWJsZXMgLXQgbmF0IC1EIFBSRVJPVVRJTkcgJGk7IGRvbmUnO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgZXhlYyhjbWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdG5ldHcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0Y29ubihkZXYsIHRlc3RpbnQpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ3dhcm4nLCAnaG9zdGFwZF9zd2l0Y2ggZXhlYycpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdG5ldHcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0Y29ubihkZXYsIHRlc3RpbnQpLnRoZW4oZnVuY3Rpb24oYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICBcbiAgICAgICAgfSlcblxuICAgIH07XG5cblxuXG59XG5cblxuXG5cblxuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
