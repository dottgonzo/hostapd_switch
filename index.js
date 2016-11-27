"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Promise = require("bluebird");
var pathExists = require("path-exists");
var dnsmasqconf = require("dnsmasq-conf");
var json_add_1 = require("json-add");
var promise_test_connection_1 = require('promise-test-connection');
var wpasupplicant_manager_1 = require('wpasupplicant-manager');
var netw_1 = require("netw");
var verb = require('verbo');
var exec = require('promised-exec');
var hostapdjs_1 = require("hostapdjs");
function testconn(d, testint) {
    return new Promise(function (resolve, reject) {
        netw_1.default().then(function (n) {
            var dev = false;
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
                    promise_test_connection_1.default().then(function () {
                        resolve(true);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    console.log("no internet test");
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
;
var HostapdSwitch = (function (_super) {
    __extends(HostapdSwitch, _super);
    function HostapdSwitch(options, init) {
        var config = {
            interface: "wlan0",
            wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
            redirect: true,
            hostapd: { interface: "wlan0", wpa_passphrase: false, ssid: "hapd111" },
            dnsmasq: { interface: "wlan0" },
            init: false
        };
        json_add_1.default(config, options);
        if (!pathExists.sync('/etc/default/hostapd')) {
            throw Error('no default conf file was founded for hostapd');
        }
        if (!config.hostapd.ssid) {
            throw Error('No ssid was provided');
        }
        if (!config.hostapd.wpa_passphrase) {
            throw Error('No wpa_passphrase was provided');
        }
        _super.call(this, config.wpasupplicant_path);
        this.config = config;
        this.dnsmasq = new dnsmasqconf(config.dnsmasq);
        if (init) {
            hostapdjs_1.default(config.hostapd).then(function () {
                console.log('hostapd is now configured');
            });
        }
        ;
    }
    ;
    HostapdSwitch.prototype.host = function (e) {
        var that = this;
        var dnsmasq = this.dnsmasq;
        var hostIp = dnsmasq.hostIp;
        var cmd = 'ifconfig ' + this.config.interface + ' down && sleep 2 ; pkill wpa_supplicant && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && sleep 5';
        return new Promise(function (resolve, reject) {
            dnsmasq.host().then(function () {
                exec(cmd).then(function () {
                    exec('iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination ' + hostIp + ':80 && iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination ' + hostIp + ':80').then(function () {
                        that.wifimode = "host";
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
        var that = this;
        var dnsmasq = this.dnsmasq;
        var hostIp = dnsmasq.hostIp;
        var cmd = 'ifconfig ' + this.config.interface + ' down && sleep 2 ; pkill wpa_supplicant && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';
        return new Promise(function (resolve, reject) {
            dnsmasq.ap().then(function () {
                exec(cmd).then(function () {
                    that.wifimode = "ap";
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
        var that = this;
        var dev = this.config.interface;
        var driver;
        if (this.config.hostapd.driver === 'nl80211') {
            driver = 'nl80211';
        }
        else {
            driver = 'wext';
        }
        var cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' -D ' + driver + ' && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done; sleep 10';
        return new Promise(function (resolve, reject) {
            exec(cmd).then(function () {
                that.wifimode = "client";
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
}(wpasupplicant_manager_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HostapdSwitch;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLElBQVksT0FBTyxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3BDLElBQVksVUFBVSxXQUFNLGFBQWEsQ0FBQyxDQUFBO0FBQzFDLElBQVksV0FBVyxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQzVDLHlCQUFrQixVQUFVLENBQUMsQ0FBQTtBQUM3Qix3Q0FBeUIseUJBQXlCLENBQUMsQ0FBQTtBQUNuRCxzQ0FBdUIsdUJBQXVCLENBQUMsQ0FBQTtBQUUvQyxxQkFBaUIsTUFBTSxDQUFDLENBQUE7QUFDeEIsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN0QywwQkFBd0IsV0FBVyxDQUFDLENBQUE7QUF5QnBDLGtCQUFrQixDQUFTLEVBQUUsT0FBaUI7SUFFMUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07UUFDakQsY0FBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNuQixJQUFJLEdBQUcsR0FBUSxLQUFLLENBQUM7WUFDckIsSUFBSSxFQUFFLEdBQVEsS0FBSyxDQUFDO1lBSXBCLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBR3ZCLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ1IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ1gsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUE7b0JBQ2pCLENBQUM7Z0JBSUwsQ0FBQztZQUNMLENBQUM7WUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNCLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNiLE1BQU0sQ0FBQyxHQUFHLEdBQUcsMkJBQTJCLENBQUMsQ0FBQztZQUc5QyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDVixpQ0FBWSxFQUFFLENBQUMsSUFBSSxDQUFDO3dCQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3QkFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsQixDQUFDO1lBQ0wsQ0FBQztRQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDbEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFBO0FBRU4sQ0FBQztBQU9BLENBQUM7QUFNRCxDQUFDO0FBSUQsQ0FBQztBQUlELENBQUM7QUFRRCxDQUFDO0FBU0QsQ0FBQztBQU1ELENBQUM7QUFzQ0Y7SUFBMkMsaUNBQVU7SUFLakQsdUJBQVksT0FBa0IsRUFBRSxJQUFjO1FBRTFDLElBQU0sTUFBTSxHQUFlO1lBQ3ZCLFNBQVMsRUFBRSxPQUFPO1lBQ2xCLGtCQUFrQixFQUFFLHlDQUF5QztZQUM3RCxRQUFRLEVBQUUsSUFBSTtZQUNkLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ3ZFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7WUFDL0IsSUFBSSxFQUFFLEtBQUs7U0FDZCxDQUFDO1FBR0Ysa0JBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFdEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFDakQsQ0FBQztRQUVELGtCQUFNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBR2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBRXJCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRS9DLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDUCxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFBQSxDQUFDO0lBRU4sQ0FBQzs7SUFFRCw0QkFBSSxHQUFKLFVBQUssQ0FBTztRQUNSLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzNCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDNUIsSUFBSSxHQUFHLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLCtHQUErRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEdBQUcsR0FBRyxNQUFNLEdBQUcsc0NBQXNDLENBQUM7UUFDaFAsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFDakQsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztnQkFFaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLENBQUMsMkVBQTJFLEdBQUcsTUFBTSxHQUFHLG1GQUFtRixHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBQ25NLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO3dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7d0JBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLHFDQUFxQyxDQUFDLENBQUE7b0JBQzdELENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLHNDQUFzQyxDQUFDLENBQUE7Z0JBQzlELENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsOENBQThDLENBQUMsQ0FBQTtZQUN0RSxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQzs7SUFHRCwwQkFBRSxHQUFGLFVBQUcsQ0FBTztRQUNOLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUVqQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzNCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDNUIsSUFBSSxHQUFHLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLCtHQUErRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEdBQUcsR0FBRyxNQUFNLEdBQUcsb0tBQW9LLENBQUE7UUFDN1csTUFBTSxDQUFDLElBQUksT0FBTyxDQUFVLFVBQVUsT0FBTyxFQUFFLE1BQU07WUFDakQsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDZCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO29CQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0JBQ2xCLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLG9DQUFvQyxDQUFDLENBQUE7Z0JBQzVELENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtZQUMzRSxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQzs7SUFFRCw4QkFBTSxHQUFOLFVBQU8sUUFBa0IsRUFBRSxPQUFpQjtRQUN4QyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFFakIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDbEMsSUFBSSxNQUFjLENBQUM7UUFDbkIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN2QixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxJQUFJLEdBQUcsR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLHlEQUF5RCxHQUFHLEdBQUcsR0FBRyx5RUFBeUUsR0FBRyxHQUFHLEdBQUcsOEJBQThCLEdBQUcsR0FBRyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsZUFBZSxHQUFHLEdBQUcsR0FBRyxxSkFBcUosQ0FBQztRQUVuYyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVUsVUFBVSxPQUFPLEVBQUUsTUFBTTtZQUVqRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNYLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO2dCQUV6QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUNYLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTt3QkFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNuQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2YsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO2dCQUN4QyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUNYLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsTUFBTTt3QkFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNuQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dCQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2YsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUdOLENBQUMsQ0FBQyxDQUFBO0lBRU4sQ0FBQzs7SUFJTCxvQkFBQztBQUFELENBdklBLEFBdUlDLENBdkkwQywrQkFBVSxHQXVJcEQ7QUF2SUQ7K0JBdUlDLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBwYXRoRXhpc3RzIGZyb20gXCJwYXRoLWV4aXN0c1wiO1xuaW1wb3J0ICogYXMgZG5zbWFzcWNvbmYgZnJvbSBcImRuc21hc3EtY29uZlwiO1xuaW1wb3J0IG1lcmdlIGZyb20gXCJqc29uLWFkZFwiO1xuaW1wb3J0IHRlc3RpbnRlcm5ldCBmcm9tICdwcm9taXNlLXRlc3QtY29ubmVjdGlvbic7XG5pbXBvcnQgd3BhbWFuYWdlciBmcm9tICd3cGFzdXBwbGljYW50LW1hbmFnZXInO1xuXG5pbXBvcnQgbmV0dyBmcm9tIFwibmV0d1wiO1xuY29uc3QgdmVyYiA9IHJlcXVpcmUoJ3ZlcmJvJyk7XG5jb25zdCBleGVjID0gcmVxdWlyZSgncHJvbWlzZWQtZXhlYycpO1xuaW1wb3J0IGhvc3RhcGRjb25mIGZyb20gXCJob3N0YXBkanNcIjtcblxuaW50ZXJmYWNlIElTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG50eXBlIElOZXR3b3JrVHlwZSA9ICd3aWZpJyB8ICd3aXJlZCdcblxuaW50ZXJmYWNlIElOZXR3b3JrIHtcbiAgICB0eXBlOiBJTmV0d29ya1R5cGU7XG4gICAgbWFjOiBzdHJpbmc7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgZXNzaWQ/OiBzdHJpbmc7XG4gICAgc2Nhbj86IElTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuXG50eXBlIEl3aWZpbW9kZSA9ICdhcCcgfCAnaG9zdCcgfCAnY2xpZW50JyB8ICd1bm1hbmFnZWQnIFxuXG5cblxuZnVuY3Rpb24gdGVzdGNvbm4oZDogc3RyaW5nLCB0ZXN0aW50PzogYm9vbGVhbikge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbmV0dygpLnRoZW4oZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIGxldCBkZXY6IGFueSA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IGlwOiBhbnkgPSBmYWxzZTtcblxuXG5cbiAgICAgICAgICAgIGZvciAobGV0IG5zID0gMDsgbnMgPCBuLmxlbmd0aDsgbnMrKykge1xuICAgICAgICAgICAgICAgIGlmIChuW25zXS5pbnRlcmZhY2UgPT0gZCkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgZGV2ID0gZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5bbnNdLmlwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpcCA9IG5bbnNdLmlwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICBpZiAobi5uZXR3b3Jrc1tuc10uZ2F0ZXdheSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGd3ID0gbi5uZXR3b3Jrc1tuc10uZ2F0ZXdheVxuICAgICAgICAgICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkZXYpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ25vIGludGVyZmFjZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghaXApIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZGV2ICsgJyBjYW5cXCd0IGdldCBhbiBpcCBhZGRyZXNzJyk7XG4gICAgICAgICAgICAgICAgLy8gIH0gZWxzZSBpZiAoIWd3KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIHJlamVjdChkZXYgKyAnIGhhcyBubyBnYXRld2F5JylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3RpbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBpbnRlcm5ldCB0ZXN0XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZWplY3QoJ25ldHcnICsgZXJyKTtcbiAgICAgICAgfSlcbiAgICB9KVxuXG59XG5cbmludGVyZmFjZSBJSG9zdGFwZCB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgc3NpZDogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlOiBhbnk7XG4gICAgZHJpdmVyPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElIb3N0YXBkQ2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkPzogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElEbnNtYXNxIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcUNmIHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSUNsYXNzT3B0IHtcbiAgICBpbnRlcmZhY2U/OiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoPzogc3RyaW5nO1xuICAgIGhvc3RhcGQ/OiBJSG9zdGFwZENmO1xuICAgIHJlZGlyZWN0PzogYm9vbGVhbjtcbiAgICBkbnNtYXNxPzogSURuc21hc3FDZjtcbn07XG5cbmludGVyZmFjZSBJQ2xhc3NDb25mIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IHN0cmluZztcbiAgICBob3N0YXBkOiBJSG9zdGFwZDtcbiAgICBkbnNtYXNxOiBJRG5zbWFzcTtcbiAgICBpbml0OiBib29sZWFuO1xuICAgIHJlZGlyZWN0OiBib29sZWFuO1xufTtcblxuaW50ZXJmYWNlIElEbnNNb2RlcyB7XG4gICAgYXA6IElEbnNNb2RlO1xuICAgIGxpbms6IElEbnNNb2RlO1xuICAgIGhvc3Q6IElEbnNNb2RlXG59O1xuXG5pbnRlcmZhY2UgSURuc01vZGUge1xuICAgIG5vcmVzb2x2OiBib29sZWFuLFxuICAgIGRuczogW3N0cmluZ10sXG4gICAgZGhjcDoge1xuICAgICAgICBzdG9wOiBudW1iZXI7XG4gICAgICAgIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIGxlYXNlOiBzdHJpbmc7XG4gICAgfTtcbiAgICBob3N0SXA6IHN0cmluZyxcbiAgICB0ZXN0OiBib29sZWFuLFxuICAgIGludGVyZmFjZTogYW55LFxuICAgIGFkZHJlc3M/OiBzdHJpbmdcbn1cblxuXG5cbmludGVyZmFjZSBJRG5zIHtcbiAgICBtb2RlczogSURuc01vZGVzO1xuICAgIG1vZGU/OiBzdHJpbmc7XG4gICAgcGF0aDogc3RyaW5nO1xuICAgIGludGVyZmFjZTogYW55O1xuICAgIHRlc3Q6IGJvb2xlYW47XG4gICAgZGhjcDoge1xuICAgICAgICBzdG9wOiBudW1iZXI7XG4gICAgICAgIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIGxlYXNlOiBzdHJpbmc7XG4gICAgfTtcbiAgICBkbnM6IFtzdHJpbmddO1xuICAgIGhvc3RJcDogc3RyaW5nO1xuICAgIGFwOiBGdW5jdGlvbjtcbiAgICBob3N0OiBGdW5jdGlvbjtcbiAgICBsaW5rOiBGdW5jdGlvbjtcbiAgICBzZXRtb2RlKHN0cmluZyk7XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSG9zdGFwZFN3aXRjaCBleHRlbmRzIHdwYW1hbmFnZXIge1xuICAgIGNvbmZpZzogSUNsYXNzQ29uZjtcbiAgICBkbnNtYXNxOiBJRG5zO1xuICAgIHdpZmltb2RlOiBJd2lmaW1vZGU7XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBJQ2xhc3NPcHQsIGluaXQ/OiBib29sZWFuKSB7XG5cbiAgICAgICAgY29uc3QgY29uZmlnOiBJQ2xhc3NDb25mID0ge1xuICAgICAgICAgICAgaW50ZXJmYWNlOiBcIndsYW4wXCIsXG4gICAgICAgICAgICB3cGFzdXBwbGljYW50X3BhdGg6IFwiL2V0Yy93cGFfc3VwcGxpY2FudC93cGFfc3VwcGxpY2FudC5jb25mXCIsXG4gICAgICAgICAgICByZWRpcmVjdDogdHJ1ZSxcbiAgICAgICAgICAgIGhvc3RhcGQ6IHsgaW50ZXJmYWNlOiBcIndsYW4wXCIsIHdwYV9wYXNzcGhyYXNlOiBmYWxzZSwgc3NpZDogXCJoYXBkMTExXCIgfSxcbiAgICAgICAgICAgIGRuc21hc3E6IHsgaW50ZXJmYWNlOiBcIndsYW4wXCIgfSxcbiAgICAgICAgICAgIGluaXQ6IGZhbHNlXG4gICAgICAgIH07XG5cblxuICAgICAgICBtZXJnZShjb25maWcsIG9wdGlvbnMpXG5cbiAgICAgICAgaWYgKCFwYXRoRXhpc3RzLnN5bmMoJy9ldGMvZGVmYXVsdC9ob3N0YXBkJykpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdubyBkZWZhdWx0IGNvbmYgZmlsZSB3YXMgZm91bmRlZCBmb3IgaG9zdGFwZCcpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb25maWcuaG9zdGFwZC5zc2lkKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTm8gc3NpZCB3YXMgcHJvdmlkZWQnKVxuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmhvc3RhcGQud3BhX3Bhc3NwaHJhc2UpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdObyB3cGFfcGFzc3BocmFzZSB3YXMgcHJvdmlkZWQnKVxuICAgICAgICB9XG5cbiAgICAgICAgc3VwZXIoY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aClcblxuXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgICAgIHRoaXMuZG5zbWFzcSA9IG5ldyBkbnNtYXNxY29uZihjb25maWcuZG5zbWFzcSk7XG5cbiAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgIGhvc3RhcGRjb25mKGNvbmZpZy5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaG9zdGFwZCBpcyBub3cgY29uZmlndXJlZCcpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH07XG5cbiAgICBob3N0KGU/OiBhbnkpIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcbiAgICAgICAgbGV0IGRuc21hc3EgPSB0aGlzLmRuc21hc3E7XG4gICAgICAgIGxldCBob3N0SXAgPSBkbnNtYXNxLmhvc3RJcDtcbiAgICAgICAgbGV0IGNtZCA9ICdpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyBkb3duICYmIHNsZWVwIDIgOyBwa2lsbCB3cGFfc3VwcGxpY2FudCAmJiBzeXN0ZW1jdGwgcmVzdGFydCBob3N0YXBkIDsgc3lzdGVtY3RsIHJlc3RhcnQgZG5zbWFzcSAmJiBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyAnICsgaG9zdElwICsgJyBuZXRtYXNrIDI1NS4yNTUuMjU1LjAgdXAgJiYgc2xlZXAgNSc7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBkbnNtYXNxLmhvc3QoKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgIGV4ZWMoY21kKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhlYygnaXB0YWJsZXMgLXQgbmF0IC1BIFBSRVJPVVRJTkcgLXAgdGNwIC0tZHBvcnQgODAgLWogRE5BVCAtLXRvLWRlc3RpbmF0aW9uICcgKyBob3N0SXAgKyAnOjgwICYmIGlwdGFibGVzIC10IG5hdCAtQSBQUkVST1VUSU5HIC1wIHRjcCAtLWRwb3J0IDQ0MyAtaiBETkFUIC0tdG8tZGVzdGluYXRpb24gJyArIGhvc3RJcCArICc6ODAnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQud2lmaW1vZGUgPSBcImhvc3RcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsICdlcnJvcicsICdob3N0YXBkX3N3aXRjaCBpcGZpbHRlciBob3N0IHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBob3N0IHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBkbnNtYXNxIGhvc3Qgc3dpdGNoJylcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfTtcblxuXG4gICAgYXAoZT86IGFueSkge1xuICAgICAgICBjb25zdCB0aGF0ID0gdGhpc1xuXG4gICAgICAgIGxldCBkbnNtYXNxID0gdGhpcy5kbnNtYXNxO1xuICAgICAgICBsZXQgaG9zdElwID0gZG5zbWFzcS5ob3N0SXA7XG4gICAgICAgIGxldCBjbWQgPSAnaWZjb25maWcgJyArIHRoaXMuY29uZmlnLmludGVyZmFjZSArICcgZG93biAmJiBzbGVlcCAyIDsgcGtpbGwgd3BhX3N1cHBsaWNhbnQgJiYgc3lzdGVtY3RsIHJlc3RhcnQgaG9zdGFwZCA7IHN5c3RlbWN0bCByZXN0YXJ0IGRuc21hc3EgJiYgaWZjb25maWcgJyArIHRoaXMuY29uZmlnLmludGVyZmFjZSArICcgJyArIGhvc3RJcCArICcgbmV0bWFzayAyNTUuMjU1LjI1NS4wIHVwICYmIGZvciBpIGluICQoIGlwdGFibGVzIC10IG5hdCAtLWxpbmUtbnVtYmVycyAtTCB8IGdyZXAgXlswLTldIHwgYXdrIFxcJ3sgcHJpbnQgJDEgfVxcJyB8IHRhYyApOyBkbyBpcHRhYmxlcyAtdCBuYXQgLUQgUFJFUk9VVElORyAkaTsgZG9uZSdcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGRuc21hc3EuYXAoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQud2lmaW1vZGUgPSBcImFwXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggZXhlY3V0aW5nIGFwIHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBkbnNtYXNxIGJlZm9yZSBhcCBzd2l0Y2gnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgY2xpZW50KHRlc3RuZXR3PzogYm9vbGVhbiwgdGVzdGludD86IGJvb2xlYW4pIHtcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXNcblxuICAgICAgICBjb25zdCBkZXYgPSB0aGlzLmNvbmZpZy5pbnRlcmZhY2U7XG4gICAgICAgIGxldCBkcml2ZXI6IHN0cmluZztcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmhvc3RhcGQuZHJpdmVyID09PSAnbmw4MDIxMScpIHtcbiAgICAgICAgICAgIGRyaXZlciA9ICdubDgwMjExJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyaXZlciA9ICd3ZXh0JztcbiAgICAgICAgfVxuICAgICAgICBsZXQgY21kID0gJ2lmY29uZmlnICcgKyBkZXYgKyAnIGRvd24gJiYgc2xlZXAgMiA7IHBraWxsIHdwYV9zdXBwbGljYW50IDsgIGRoY2xpZW50IC1yICcgKyBkZXYgKyAnIDsgc3lzdGVtY3RsIHN0b3AgaG9zdGFwZCA7IHN5c3RlbWN0bCBzdG9wIGRuc21hc3EgOyBzbGVlcCAyOyBpZmNvbmZpZyAnICsgZGV2ICsgJyB1cCAmJiB3cGFfc3VwcGxpY2FudCAtQiAtaSAnICsgZGV2ICsgJyAtYyAnICsgdGhpcy5jb25maWcud3Bhc3VwcGxpY2FudF9wYXRoICsgJyAtRCAnICsgZHJpdmVyICsgJyAmJiBkaGNsaWVudCAnICsgZGV2ICsgJyAmJiBmb3IgaSBpbiAkKCBpcHRhYmxlcyAtdCBuYXQgLS1saW5lLW51bWJlcnMgLUwgfCBncmVwIF5bMC05XSB8IGF3ayBcXCd7IHByaW50ICQxIH1cXCcgfCB0YWMgKTsgZG8gaXB0YWJsZXMgLXQgbmF0IC1EIFBSRVJPVVRJTkcgJGk7IGRvbmU7IHNsZWVwIDEwJztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhhdC53aWZpbW9kZSA9IFwiY2xpZW50XCI7XG5cbiAgICAgICAgICAgICAgICBpZiAodGVzdG5ldHcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVzdGNvbm4oZGV2LCB0ZXN0aW50KS50aGVuKGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYW5zd2VyKVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmVyYihlcnIsICd3YXJuJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWMnKVxuICAgICAgICAgICAgICAgIGlmICh0ZXN0bmV0dykge1xuICAgICAgICAgICAgICAgICAgICB0ZXN0Y29ubihkZXYsIHRlc3RpbnQpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG5cblxuICAgICAgICB9KVxuXG4gICAgfTtcblxuXG5cbn1cblxuXG5cblxuXG5cbiJdfQ==
