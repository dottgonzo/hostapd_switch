"use strict";
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
var config = {
    interface: "wlan0",
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
    redirect: true,
    hostapd: { interface: "wlan0", wpa_passphrase: false, ssid: "hapd111" },
    dnsmasq: { interface: "wlan0" },
    init: false
};
;
var HostapdSwitch = (function (_super) {
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
        _super.call(this, config.wpasupplicant_path);
        this.config = config;
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
        var cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';
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
}(wpamanager));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HostapdSwitch;

//# sourceMappingURL=data:application/json;base64,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RSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxNQUFNO3dCQUN2QyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ25CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLEdBQUc7d0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDZixDQUFDLENBQUMsQ0FBQTtnQkFDTixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFBO1FBR2QsQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDOztJQUlMLG9CQUFDO0FBQUQsQ0FsSEEsQUFrSEMsQ0FsSDBDLFVBQVUsR0FrSHBEO0FBbEhEOytCQWtIQyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgcGF0aEV4aXN0cyBmcm9tIFwicGF0aC1leGlzdHNcIjtcbmltcG9ydCAqIGFzIGRuc21hc3Fjb25mIGZyb20gXCJkbnNtYXNxLWNvbmZcIjtcbmltcG9ydCBtZXJnZSA9IHJlcXVpcmUoXCJqc29uLWFkZFwiKTtcbmltcG9ydCB0ZXN0aW50ZXJuZXQgPSByZXF1aXJlKCdwcm9taXNlLXRlc3QtY29ubmVjdGlvbicpO1xuaW1wb3J0IHdwYW1hbmFnZXIgPSByZXF1aXJlKCd3cGFzdXBwbGljYW50LW1hbmFnZXInKTtcblxubGV0IG5ldHcgPSByZXF1aXJlKFwibmV0d1wiKTtcbmxldCB2ZXJiID0gcmVxdWlyZSgndmVyYm8nKTtcbmxldCBleGVjID0gcmVxdWlyZSgncHJvbWlzZWQtZXhlYycpO1xubGV0IGhvc3RhcGRjb25mID0gcmVxdWlyZShcImhvc3RhcGRqc1wiKTtcbmludGVyZmFjZSBTY2FuIHtcbiAgICBlc3NpZDogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIHNpZ25hbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTmV0d29yayB7XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIG1hYzogc3RyaW5nO1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIGVzc2lkPzogc3RyaW5nO1xuICAgIHNjYW4/OiBTY2FuW107XG4gICAgaXA/OiBzdHJpbmc7XG4gICAgZ2F0ZXdheT86IHN0cmluZztcbn1cblxuXG5mdW5jdGlvbiB0ZXN0Y29ubihkOiBzdHJpbmcsIHRlc3RpbnQ/OiBib29sZWFuKSB7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIG5ldHcoKS50aGVuKGZ1bmN0aW9uKG46TmV0d29ya1tdKSB7XG4gICAgICAgICAgICBsZXQgZGV2OiBhbnkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXR3OiBOZXR3b3JrO1xuICAgICAgICAgICAgbGV0IGlwOiBhbnkgPSBmYWxzZTtcblxuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAobGV0IG5zID0gMDsgbnMgPCBuLmxlbmd0aDsgbnMrKykge1xuICAgICAgICAgICAgICAgIGlmIChuW25zXS5pbnRlcmZhY2UgPT0gZCkge1xuXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkZXYgPSBkO1xuICAgICAgICAgICAgICAgICAgICBpZiAobltuc10uaXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlwID0gbltuc10uaXBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgIGlmIChuLm5ldHdvcmtzW25zXS5nYXRld2F5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgZ3cgPSBuLm5ldHdvcmtzW25zXS5nYXRld2F5XG4gICAgICAgICAgICAgICAgICAgIC8vICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRldikge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnbm8gaW50ZXJmYWNlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFpcCkge1xuICAgICAgICAgICAgICAgIHJlamVjdChkZXYgKyAnIGNhblxcJ3QgZ2V0IGFuIGlwIGFkZHJlc3MnKTtcbiAgICAgICAgICAgICAgICAvLyAgfSBlbHNlIGlmICghZ3cpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgcmVqZWN0KGRldiArICcgaGFzIG5vIGdhdGV3YXknKVxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0ZXN0aW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RpbnRlcm5ldCgpLnRoZW4oZnVuY3Rpb24oYTogeyBpcD86IGFueSB9KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS5pcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBpbnRlcm5ldCB0ZXN0XCIpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdCgnbmV0dycgKyBlcnIpO1xuICAgICAgICB9KVxuICAgIH0pXG5cbn1cblxuaW50ZXJmYWNlIElIb3N0YXBkIHtcbiAgICBpbnRlcmZhY2U6IHN0cmluZztcbiAgICBzc2lkOiBzdHJpbmc7XG4gICAgd3BhX3Bhc3NwaHJhc2U6IGFueTtcblxufTtcblxuaW50ZXJmYWNlIElIb3N0YXBkQ2Yge1xuICAgIGRyaXZlcj86IHN0cmluZztcbiAgICBzc2lkPzogc3RyaW5nO1xuICAgIHdwYV9wYXNzcGhyYXNlPzpzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgSURuc21hc3Ege1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xufTtcblxuaW50ZXJmYWNlIElEbnNtYXNxQ2Yge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbn07XG5cbmludGVyZmFjZSBJQ2xhc3NPcHQge1xuICAgIGludGVyZmFjZT86IHN0cmluZztcbiAgICB3cGFzdXBwbGljYW50X3BhdGg/OiBzdHJpbmc7XG4gICAgaG9zdGFwZD86IElIb3N0YXBkQ2Y7XG4gICAgcmVkaXJlY3Q/OiBib29sZWFuO1xuICAgIGRuc21hc3E/OiBJRG5zbWFzcUNmO1xufTtcblxuaW50ZXJmYWNlIElDbGFzc0NvbmYge1xuICAgIGludGVyZmFjZTogc3RyaW5nO1xuICAgIHdwYXN1cHBsaWNhbnRfcGF0aDogc3RyaW5nO1xuICAgIGhvc3RhcGQ6IElIb3N0YXBkO1xuICAgIGRuc21hc3E6IElEbnNtYXNxO1xuICAgIGluaXQ6IGJvb2xlYW47XG4gICAgcmVkaXJlY3Q6IGJvb2xlYW47XG59O1xuXG5cbmxldCBjb25maWc6IElDbGFzc0NvbmYgPSB7XG4gICAgaW50ZXJmYWNlOiBcIndsYW4wXCIsXG4gICAgd3Bhc3VwcGxpY2FudF9wYXRoOiBcIi9ldGMvd3BhX3N1cHBsaWNhbnQvd3BhX3N1cHBsaWNhbnQuY29uZlwiLFxuICAgIHJlZGlyZWN0OiB0cnVlLFxuICAgIGhvc3RhcGQ6IHsgaW50ZXJmYWNlOiBcIndsYW4wXCIsIHdwYV9wYXNzcGhyYXNlOiBmYWxzZSwgc3NpZDogXCJoYXBkMTExXCIgfSxcbiAgICBkbnNtYXNxOiB7IGludGVyZmFjZTogXCJ3bGFuMFwiIH0sXG4gICAgaW5pdDogZmFsc2Vcbn07XG5cbmludGVyZmFjZSBJRG5zTW9kZXMge1xuICAgIGFwOiBJRG5zTW9kZTtcbiAgICBsaW5rOiBJRG5zTW9kZTtcbiAgICBob3N0OiBJRG5zTW9kZVxufTtcblxuaW50ZXJmYWNlIElEbnNNb2RlIHtcbiAgICBub3Jlc29sdjogYm9vbGVhbixcbiAgICBkbnM6IFtzdHJpbmddLFxuICAgIGRoY3A6IHtcbiAgICAgICAgc3RvcDogbnVtYmVyO1xuICAgICAgICBzdGFydDogbnVtYmVyO1xuICAgICAgICBsZWFzZTogc3RyaW5nO1xuICAgIH07XG4gICAgaG9zdElwOiBzdHJpbmcsXG4gICAgdGVzdDogYm9vbGVhbixcbiAgICBpbnRlcmZhY2U6IGFueSxcbiAgICBhZGRyZXNzPzogc3RyaW5nXG59XG5cblxuXG5pbnRlcmZhY2UgSURucyB7XG4gICAgICAgIG1vZGVzOiBJRG5zTW9kZXM7XG4gICAgbW9kZT86IHN0cmluZztcbiAgICBwYXRoOnN0cmluZztcbiAgICAgICAgaW50ZXJmYWNlOiBhbnk7XG4gICAgdGVzdDogYm9vbGVhbjtcbiAgICBkaGNwOiB7XG4gICAgICAgIHN0b3A6IG51bWJlcjtcbiAgICAgICAgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgbGVhc2U6IHN0cmluZztcbiAgICB9O1xuICAgIGRuczogW3N0cmluZ107XG4gICAgaG9zdElwOiBzdHJpbmc7XG4gICAgYXA6RnVuY3Rpb247XG4gICAgaG9zdDpGdW5jdGlvbjtcbiAgICBsaW5rOkZ1bmN0aW9uO1xuICAgIHNldG1vZGUoc3RyaW5nKTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb3N0YXBkU3dpdGNoIGV4dGVuZHMgd3BhbWFuYWdlciB7XG4gICAgY29uZmlnOiBJQ2xhc3NDb25mO1xuICAgIGRuc21hc3E6IElEbnM7XG4gICAgbW9kZTpzdHJpbmc7XG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogSUNsYXNzT3B0LCBpbml0PzogYm9vbGVhbikge1xuICAgICAgICBtZXJnZShjb25maWcsIG9wdGlvbnMpXG5cbiAgICAgICAgaWYgKCFwYXRoRXhpc3RzLnN5bmMoJy9ldGMvZGVmYXVsdC9ob3N0YXBkJykpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdubyBkZWZhdWx0IGNvbmYgZmlsZSB3YXMgZm91bmRlZCBmb3IgaG9zdGFwZCcpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb25maWcuaG9zdGFwZC5zc2lkKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignTm8gc3NpZCB3YXMgcHJvdmlkZWQnKVxuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmhvc3RhcGQud3BhX3Bhc3NwaHJhc2UpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdObyB3cGFfcGFzc3BocmFzZSB3YXMgcHJvdmlkZWQnKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzdXBlcihjb25maWcud3Bhc3VwcGxpY2FudF9wYXRoKVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgICAgIHRoaXMuZG5zbWFzcSA9IG5ldyBkbnNtYXNxY29uZihjb25maWcuZG5zbWFzcSk7XG5cbiAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgIGhvc3RhcGRjb25mKGNvbmZpZy5ob3N0YXBkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdob3N0YXBkIGlzIG5vdyBjb25maWd1cmVkJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfTtcblxuICAgIGhvc3QoZT86IGFueSkge1xuICAgICAgICB0aGlzLm1vZGU9XCJob3N0XCI7XG4gICAgICAgIGxldCBkbnNtYXNxID0gdGhpcy5kbnNtYXNxO1xuICAgICAgICBsZXQgaG9zdElwID0gZG5zbWFzcS5ob3N0SXA7XG4gICAgICAgIGxldCBjbWQgPSAncGtpbGwgd3BhX3N1cHBsaWNhbnQgOyBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyB1cCAmJiBzeXN0ZW1jdGwgcmVzdGFydCBob3N0YXBkIDsgc3lzdGVtY3RsIHJlc3RhcnQgZG5zbWFzcSAmJiBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyAnICsgaG9zdElwICsgJyBuZXRtYXNrIDI1NS4yNTUuMjU1LjAgdXAgJiYgc2xlZXAgNSc7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGRuc21hc3Euc2V0bW9kZSgnaG9zdCcpLnRoZW4oZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhlYygnaXB0YWJsZXMgLXQgbmF0IC1BIFBSRVJPVVRJTkcgLXAgdGNwIC0tZHBvcnQgODAgLWogRE5BVCAtLXRvLWRlc3RpbmF0aW9uICcgKyBob3N0SXAgKyAnOjgwICYmIGlwdGFibGVzIC10IG5hdCAtQSBQUkVST1VUSU5HIC1wIHRjcCAtLWRwb3J0IDQ0MyAtaiBETkFUIC0tdG8tZGVzdGluYXRpb24gJyArIGhvc3RJcCArICc6ODAnKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggaXBmaWx0ZXIgaG9zdCBzd2l0Y2gnKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBob3N0IHN3aXRjaCcpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIHZlcmIoZXJyLCAnZXJyb3InLCAnaG9zdGFwZF9zd2l0Y2ggZXhlY3V0aW5nIGRuc21hc3EgaG9zdCBzd2l0Y2gnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9O1xuXG5cbiAgICBhcChlPzogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlPVwiYXBcIjtcbiAgICAgICAgbGV0IGRuc21hc3EgPSB0aGlzLmRuc21hc3E7XG4gICAgICAgIGxldCBob3N0SXAgPSBkbnNtYXNxLmhvc3RJcDtcbiAgICAgICAgbGV0IGNtZCA9ICdwa2lsbCB3cGFfc3VwcGxpY2FudCA7IGlmY29uZmlnICcgKyB0aGlzLmNvbmZpZy5pbnRlcmZhY2UgKyAnIHVwICAmJiBzeXN0ZW1jdGwgcmVzdGFydCBob3N0YXBkIDsgc3lzdGVtY3RsIHJlc3RhcnQgZG5zbWFzcSAmJiBpZmNvbmZpZyAnICsgdGhpcy5jb25maWcuaW50ZXJmYWNlICsgJyAnICsgaG9zdElwICsgJyBuZXRtYXNrIDI1NS4yNTUuMjU1LjAgdXAgJiYgZm9yIGkgaW4gJCggaXB0YWJsZXMgLXQgbmF0IC0tbGluZS1udW1iZXJzIC1MIHwgZ3JlcCBeWzAtOV0gfCBhd2sgXFwneyBwcmludCAkMSB9XFwnIHwgdGFjICk7IGRvIGlwdGFibGVzIC10IG5hdCAtRCBQUkVST1VUSU5HICRpOyBkb25lJ1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBkbnNtYXNxLmFwKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBhcCBzd2l0Y2gnKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICB2ZXJiKGVyciwgJ2Vycm9yJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWN1dGluZyBkbnNtYXNxIGJlZm9yZSBhcCBzd2l0Y2gnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgY2xpZW50KHRlc3RuZXR3PzogYm9vbGVhbiwgdGVzdGludD86IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGU9XCJjbGllbnRcIjtcbiAgICAgICAgbGV0IGRldiA9IHRoaXMuY29uZmlnLmludGVyZmFjZTtcbiAgICAgICAgbGV0IGNtZCA9ICdpZmNvbmZpZyAnICsgZGV2ICsgJyBkb3duICYmIHNsZWVwIDIgOyBwa2lsbCB3cGFfc3VwcGxpY2FudCA7ICBkaGNsaWVudCAtciAnICsgZGV2ICsgJyA7IHN5c3RlbWN0bCBzdG9wIGhvc3RhcGQgOyBzeXN0ZW1jdGwgc3RvcCBkbnNtYXNxIDsgc2xlZXAgMjsgaWZjb25maWcgJyArIGRldiArICcgdXAgJiYgd3BhX3N1cHBsaWNhbnQgLUIgLWkgJyArIGRldiArICcgLWMgJyArIHRoaXMuY29uZmlnLndwYXN1cHBsaWNhbnRfcGF0aCArICcgJiYgZGhjbGllbnQgJyArIGRldiArICcgJiYgZm9yIGkgaW4gJCggaXB0YWJsZXMgLXQgbmF0IC0tbGluZS1udW1iZXJzIC1MIHwgZ3JlcCBeWzAtOV0gfCBhd2sgXFwneyBwcmludCAkMSB9XFwnIHwgdGFjICk7IGRvIGlwdGFibGVzIC10IG5hdCAtRCBQUkVST1VUSU5HICRpOyBkb25lJztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgIGV4ZWMoY21kKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3RuZXR3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGNvbm4oZGV2LCB0ZXN0aW50KS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyYihlcnIsICd3YXJuJywgJ2hvc3RhcGRfc3dpdGNoIGV4ZWMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3RuZXR3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGNvbm4oZGV2LCB0ZXN0aW50KS50aGVuKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFuc3dlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgXG4gICAgICAgIH0pXG5cbiAgICB9O1xuXG5cblxufVxuXG5cblxuXG5cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
