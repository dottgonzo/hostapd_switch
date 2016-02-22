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
            var ip = false;
            var netw;
            for (var ns = 0; ns < n.networks.length; ns++) {
                if (n.networks[ns].interface == d) {
                    netw = n.networks[ns];
                    dev = d;
                    if (n.networks[ns].ip) {
                        ip = n.networks[ns].ip;
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
                netw.mode = "client";
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
        var dev = this.config.interface;
        var cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' -D wext && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';
        return new Promise(function (resolve, reject) {
            netw().then(function (n) {
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
            }).catch(function (err) {
                verb(err, 'error', 'hostapd_switch conf error');
            });
        });
    };
    ;
    return HostapdSwitch;
})(wpamanager);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbInRlc3Rjb25uIiwiY29uc3RydWN0b3IiLCJob3N0IiwiYXAiLCJjbGllbnQiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQ0EsSUFBWSxPQUFPLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDcEMsSUFBWSxVQUFVLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFDMUMsSUFBWSxXQUFXLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDNUMsSUFBTyxLQUFLLFdBQVcsVUFBVSxDQUFDLENBQUM7QUFDbkMsSUFBTyxZQUFZLFdBQVcseUJBQXlCLENBQUMsQ0FBQztBQUN6RCxJQUFPLFVBQVUsV0FBVyx1QkFBdUIsQ0FBQyxDQUFDO0FBRXJELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUd2QyxrQkFBa0IsQ0FBUyxFQUFFLE9BQWlCO0lBRTFDQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFVQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtRQUNoRCxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDO1lBQ2xCLElBQUksR0FBRyxHQUFRLEtBQUssQ0FBQztZQUNyQixJQUFJLEVBQUUsR0FBUSxLQUFLLENBQUM7WUFDcEIsSUFBSSxJQUFzQixDQUFDO1lBQzNCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUM1QyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMs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VSxDQTRHOUMsQ0FBQSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIHBhdGhFeGlzdHMgZnJvbSBcInBhdGgtZXhpc3RzXCI7XG5pbXBvcnQgKiBhcyBkbnNtYXNxY29uZiBmcm9tIFwiZG5zbWFzcS1jb25mXCI7XG5pbXBvcnQgbWVyZ2UgPSByZXF1aXJlKFwianNvbi1hZGRcIik7XG5pbXBvcnQgdGVzdGludGVybmV0ID0gcmVxdWlyZSgncHJvbWlzZS10ZXN0LWNvbm5lY3Rpb24nKTtcbmltcG9ydCB3cGFtYW5hZ2VyID0gcmVxdWlyZSgnd3Bhc3VwcGxpY2FudC1tYW5hZ2VyJyk7XG5cbmxldCBuZXR3ID0gcmVxdWlyZShcIm5ldHdcIik7XG5sZXQgdmVyYiA9IHJlcXVpcmUoJ3ZlcmJvJyk7XG5sZXQgZXhlYyA9IHJlcXVpcmUoJ3Byb21pc2VkLWV4ZWMnKTtcbmxldCBob3N0YXBkY29uZiA9IHJlcXVpcmUoXCJob3N0YXBkanNcIik7XG5cblxuZnVuY3Rpb24gdGVzdGNvbm4oZDogc3RyaW5nLCB0ZXN0aW50PzogYm9vbGVhbikge1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBuZXR3KCkudGhlbihmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBsZXQgZGV2OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBpcDogYW55ID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgbmV0dzogeyBtb2RlOiBzdHJpbmcgfTtcbiAgICAgICAgICAgIGZvciAobGV0IG5zID0gMDsgbnMgPCBuLm5ldHdvcmtzLmxlbmd0aDsgbnMrKykge1xuICAgICAgICAgICAgICAgIGlmIChuLm5ldHdvcmtzW25zXS5pbnRlcmZhY2UgPT0gZCkge1xuICAgICAgICAgICAgICAgICAgICBuZXR3ID0gbi5uZXR3b3Jrc1tuc107XG4gICAgICAgICAgICAgICAgICAgIGRldiA9IGQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuLm5ldHdvcmtzW25zXS5pcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXAgPSBuLm5ldHdvcmtzW25zXS5pcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgaWYgKG4ubmV0d29ya3NbbnNdLmdhdGV3YXkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBndyA9IG4ubmV0d29ya3NbbnNdLmdhdGV3YXlcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZGV2KSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdubyBpbnRlcmZhY2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlwKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGRldiArICcgY2FuXFwndCBnZXQgYW4gaXAgYWRkcmVzcycpO1xuICAgICAgICAgICAgICAgIC8vICB9IGVsc2UgaWYgKCFndykge1xuICAgICAgICAgICAgICAgIC8vICAgICByZWplY3QoZGV2ICsgJyBoYXMgbm8gZ2F0ZXdheScpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ldHcubW9kZSA9IFwiY2xpZW50XCI7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3RpbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVzdGludGVybmV0KCkudGhlbihmdW5jdGlvbihhOiB7IGlwPzogYW55IH0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLmlwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIndhcm4gbm8gaW50ZXJuZXRcIik7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KCduZXR3JyArIGVycik7XG4gICAgICAgIH0pXG4gICAgfSlcblxufVxuXG5pbnRlcmZhY2UgSUhvc3RhcGQge1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIHNzaWQ6IHN0cmluZztcbiAgICB3cGFfcGFzc3BocmFzZTogYW55O1xuICAgICAgICBmaWxlY29uZjpzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSUhvc3RhcGRDZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIHNzaWQ/OiBzdHJpbmc7XG4gICAgZmlsZWNvbmY/OnN0cmluZztcbn07XG5cbmludGVyZmFjZSBJRG5zbWFzcSB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSURuc21hc3FDZiB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElDbGFzc09wdCB7XG4gICAgaW50ZXJmYWNlPzogc3RyaW5nO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aD86IHN0cmluZztcbiAgICBob3N0YXBkPzogSUhvc3RhcGRDZjtcbiAgICByZWRpcmVjdD86IGJvb2xlYW47XG4gICAgZG5zbWFzcT86IElEbnNtYXNxQ2Y7XG59O1xuXG5pbnRlcmZhY2UgSUNsYXNzQ29uZiB7XG4gICAgaW50ZXJmYWNlOiBzdHJpbmc7XG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBzdHJpbmc7XG4gICAgaG9zdGFwZDogSUhvc3RhcGQ7XG4gICAgZG5zbWFzcTogSURuc21hc3E7XG4gICAgaW5pdDogYm9vbGVhbjtcbiAgICByZWRpcmVjdDogYm9vbGVhbjtcbn07XG5cblxubGV0IGNvbmZpZzogSUNsYXNzQ29uZiA9IHtcbiAgICBpbnRlcmZhY2U6IFwid2xhbjBcIixcbiAgICB3cGFzdXBwbGljYW50X3BhdGg6IFwiL2V0Yy93cGFfc3VwcGxpY2FudC93cGFfc3VwcGxpY2FudC5jb25mXCIsXG4gICAgcmVkaXJlY3Q6IHRydWUsXG4gICAgaG9zdGFwZDogeyBpbnRlcmZhY2U6IFwid2xhbjBcIiwgd3BhX3Bhc3NwaHJhc2U6IGZhbHNlLCBzc2lkOiBcImhhcGQxMTFcIiwgZmlsZWNvbmY6XCIvZXRjL2RlZmF1bHQvaG9zdGFwZFwiIH0sXG4gICAgZG5zbWFzcTogeyBpbnRlcmZhY2U6IFwid2xhbjBcIiB9LFxuICAgIGluaXQ6IGZhbHNlXG59O1xuXG5pbnRlcmZhY2UgSURuc01vZGVzIHtcbiAgICBhcDogSURuc01vZGU7XG4gICAgbGluazogSURuc01vZGU7XG4gICAgaG9zdDogSURuc01vZGVcbn07XG5cbmludGVyZmFjZSBJRG5zTW9kZSB7XG4gICAgbm9yZXNvbHY6IGJvb2xlYW4sXG4gICAgZG5zOiBbc3RyaW5nXSxcbiAgICBkaGNwOiB7XG4gICAgICAgIHN0b3A6IG51bWJlcjtcbiAgICAgICAgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgbGVhc2U6IHN0cmluZztcbiAgICB9O1xuICAgIGhvc3RJcDogc3RyaW5nLFxuICAgIHRlc3Q6IGJvb2xlYW4sXG4gICAgaW50ZXJmYWNlOiBhbnksXG4gICAgYWRkcmVzcz86IHN0cmluZ1xufVxuXG5cblxuaW50ZXJmYWNlIElEbnMge1xuICAgICAgICBtb2RlczogSURuc01vZGVzO1xuICAgIG1vZGU/OiBzdHJpbmc7XG4gICAgcGF0aDpzdHJpbmc7XG4gICAgICAgIGludGVyZmFjZTogYW55O1xuICAgIHRlc3Q6IGJvb2xlYW47XG4gICAgZGhjcDoge1xuICAgICAgICBzdG9wOiBudW1iZXI7XG4gICAgICAgIHN0YXJ0OiBudW1iZXI7XG4gICAgICAgIGxlYXNlOiBzdHJpbmc7XG4gICAgfTtcbiAgICBkbnM6IFtzdHJpbmddO1xuICAgIGhvc3RJcDogc3RyaW5nO1xuICAgIGFwOkZ1bmN0aW9uO1xuICAgIGhvc3Q6RnVuY3Rpb247XG4gICAgbGluazpGdW5jdGlvbjtcbiAgICBzZXRtb2RlKHN0cmluZyk7XG59XG5cblxuZXhwb3J0ID0gY2xhc3MgSG9zdGFwZFN3aXRjaCBleHRlbmRzIHdwYW1hbmFnZXIge1xuICAgIGNvbmZpZzogSUNsYXNzQ29uZjtcbiAgICBkbnNtYXNxOiBJRG5zO1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IElDbGFzc09wdCwgaW5pdD86IGJvb2xlYW4pIHtcbiAgICAgICAgbWVyZ2UoY29uZmlnLCBvcHRpb25zKVxuXG4gICAgICAgIGlmICghcGF0aEV4aXN0cy5zeW5jKCcvZXRjL2RlZmF1bHQvaG9zdGFwZCcpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbm8gZGVmYXVsdCBjb25mIGZpbGUgd2FzIGZvdW5kZWQgZm9yIGhvc3RhcGQnKVxuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmhvc3RhcGQuc3NpZCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ05vIHNzaWQgd2FzIHByb3ZpZGVkJylcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbmZpZy5ob3N0YXBkLndwYV9wYXNzcGhyYXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTm8gd3BhX3Bhc3NwaHJhc2Ugd2FzIHByb3ZpZGVkJylcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbnN1cGVyKGNvbmZpZy53cGFzdXBwbGljYW50X3BhdGgpXG4gICAgICAgIHRoaXMuZG5zbWFzcSA9IG5ldyBkbnNtYXNxY29uZihjb25maWcuZG5zbWFzcSk7XG5cbiAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgIGhvc3RhcGRjb25mKGNvbmZpZy5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdob3N0YXBkIGlzIG5vdyBjb25maWd1cmVkJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfTtcblxuICAgIGhvc3QoZT86IGFueSkge1xuICAgICAgICBsZXQgZG5zbWFzcSA9IHRoaXMuZG5zbWFzcTtcbiAgICAgICAgbGV0IGhvc3RJcCA9IGRuc21hc3EuaG9zdElwO1xuICAgICAgICBsZXQgY21kID0gJ3BraWxsIHdwYV9zdXBwbGljYW50IDsgaWZjb25maWcgJyArIHRoaXMuY29uZmlnLmludGVyZmFjZSArICcgdXAgJiYgc3lzdGVtY3RsIHJlc3RhcnQgaG9zdGFwZCA7IHN5c3RlbWN0bCByZXN0YXJ0IGRuc21hc3EgJiYgaWZjb25maWcgJyArIHRoaXMuY29uZmlnLmludGVyZmFjZSArICcgJyArIGhvc3RJcCArICcgbmV0bWFzayAyNTUuMjU1LjI1NS4wIHVwICYmIHNsZWVwIDUnO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBkbnNtYXNxLnNldG1vZGUoJ2hvc3QnKS50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgZXhlYyhjbWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4ZWMoJ2lwdGFibGVzIC10IG5hdCAtQSBQUkVST1VUSU5HIC1wIHRjcCAtLWRwb3J0IDgwIC1qIEROQVQgLS10by1kZXN0aW5hdGlvbiAnICsgaG9zdElwICsgJzo4MCAmJiBpcHRhYmxlcyAtdCBuYXQgLUEgUFJFUk9VVElORyAtcCB0Y3AgLS1kcG9ydCA0NDMgLWogRE5BVCAtLXRvLWRlc3RpbmF0aW9uICcgKyBob3N0SXAgKyAnOjgwJykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGlwZmlsdGVyIGhvc3Qgc3dpdGNoJylcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsICdlcnJvcicsICdob3N0YXBkX3N3aXRjaCBleGVjdXRpbmcgaG9zdCBzd2l0Y2gnKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBkbnNtYXNxIGhvc3Qgc3dpdGNoJylcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfTtcblxuXG4gICAgYXAoZT86IGFueSkge1xuICAgICAgICBsZXQgZG5zbWFzcSA9IHRoaXMuZG5zbWFzcTtcbiAgICAgICAgbGV0IGhvc3RJcCA9IGRuc21hc3EuaG9zdElwO1xuICAgICAgICBsZXQgY21kID0gJ3BraWxsIHdwYV9zdXBwbGljYW50IDsgaWZjb25maWcgJyArIHRoaXMuY29uZmlnLmludGVyZmFjZSArICcgdXAgICYmIHN5c3RlbWN0bCByZXN0YXJ0IGhvc3RhcGQgOyBzeXN0ZW1jdGwgcmVzdGFydCBkbnNtYXNxICYmIGlmY29uZmlnICcgKyB0aGlzLmNvbmZpZy5pbnRlcmZhY2UgKyAnICcgKyBob3N0SXAgKyAnIG5ldG1hc2sgMjU1LjI1NS4yNTUuMCB1cCAmJiBmb3IgaSBpbiAkKCBpcHRhYmxlcyAtdCBuYXQgLS1saW5lLW51bWJlcnMgLUwgfCBncmVwIF5bMC05XSB8IGF3ayBcXCd7IHByaW50ICQxIH1cXCcgfCB0YWMgKTsgZG8gaXB0YWJsZXMgLXQgbmF0IC1EIFBSRVJPVVRJTkcgJGk7IGRvbmUnXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGRuc21hc3EuYXAoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGV4ZWMoY21kKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggZXhlY3V0aW5nIGFwIHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggZXhlY3V0aW5nIGRuc21hc3EgYmVmb3JlIGFwIHN3aXRjaCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH07XG5cbiAgICBjbGllbnQodGVzdG5ldHc/OiBib29sZWFuLCB0ZXN0aW50PzogYm9vbGVhbikge1xuXG4gICAgICAgIGxldCBkZXYgPSB0aGlzLmNvbmZpZy5pbnRlcmZhY2U7XG4gICAgICAgIGxldCBjbWQgPSAnaWZjb25maWcgJyArIGRldiArICcgZG93biAmJiBzbGVlcCAyIDsgcGtpbGwgd3BhX3N1cHBsaWNhbnQgOyAgZGhjbGllbnQgLXIgJyArIGRldiArICcgOyBzeXN0ZW1jdGwgc3RvcCBob3N0YXBkIDsgc3lzdGVtY3RsIHN0b3AgZG5zbWFzcSA7IHNsZWVwIDI7IGlmY29uZmlnICcgKyBkZXYgKyAnIHVwICYmIHdwYV9zdXBwbGljYW50IC1CIC1pICcgKyBkZXYgKyAnIC1jICcgKyB0aGlzLmNvbmZpZy53cGFzdXBwbGljYW50X3BhdGggKyAnIC1EIHdleHQgJiYgZGhjbGllbnQgJyArIGRldiArICcgJiYgZm9yIGkgaW4gJCggaXB0YWJsZXMgLXQgbmF0IC0tbGluZS1udW1iZXJzIC1MIHwgZ3JlcCBeWzAtOV0gfCBhd2sgXFwneyBwcmludCAkMSB9XFwnIHwgdGFjICk7IGRvIGlwdGFibGVzIC10IG5hdCAtRCBQUkVST1VUSU5HICRpOyBkb25lJztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uKG4pIHtcblxuICAgICAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXN0bmV0dykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3Rjb25uKGRldiwgdGVzdGludCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnd2FybicsICdob3N0YXBkX3N3aXRjaCBleGVjJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXN0bmV0dykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3Rjb25uKGRldiwgdGVzdGludCkudGhlbihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbnN3ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGNvbmYgZXJyb3InKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuICAgIH07XG5cblxuXG59XG5cblxuXG5cblxuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
