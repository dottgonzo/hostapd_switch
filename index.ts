
import * as Promise from "bluebird";
import * as pathExists from "path-exists";
import * as dnsmasqconf from "dnsmasq-conf";
import merge = require("json-add");
import testinternet = require('promise-test-connection');
let netw = require("netw");
let verb = require('verbo');
let exec = require('promised-exec');
let hostapdconf = require("hostapdjs");


function testconn(d: string, testint?: boolean) {

    return new Promise(function(resolve, reject) {
        netw().then(function(n) {
            let dev: any = false;
            let ip: any = false;
            let gw: any = false;
            for (let ns = 0; ns < n.networks.length; ns++) {
                if (n.networks[ns].interface == d) {
                    dev = d;
                    if (n.networks[ns].ip) {
                        ip = n.networks[ns].ip
                    }
                    if (n.networks[ns].gateway) {
                        gw = n.networks[ns].gateway
                    }
                }
            }
            if (!dev) {
                reject('no interface')
            } else if (!ip) {
                reject(dev + ' can\'t get an ip address')
            } else if (!gw) {
                reject(dev + ' has no gateway')
            } else {
                if (testint) {
                    testinternet().then(function(a: { ip?: boolean }) {
                        if (a.ip) {
                            resolve({
                                mode: 'client', ip: ip, gateway: gw, externalIp: a.ip
                            })
                        } else {
                            resolve({ mode: 'client', ip: ip, gateway: gw })
                        }
                    }).catch(function(err) {
                        reject(err)
                    })
                } else {
                    resolve({ mode: 'client', ip: ip, gateway: gw })
                }
            }

        }).catch(function(err) {
            reject('netw' + err)
        })
    })

}

interface IHostapd{
    interface:string;
        ssid:string;
            wpa_passphrase:any;
};

interface IHostapdCf{
    interface?:string;
        ssid?:string;
};
interface IDnsmasq{
    interface:string;
};

interface IDnsmasqCf{
    interface?:string;
};


interface IClass{
    interface:string;
    wpasupplicant_path:string;
    hostapd:IHostapd,
    init:boolean;
};



interface IClassConf{
    interface?:string;
    wpasupplicant_path?:string;
    hostapd?:IHostapdCf;
    redirect?:boolean;
        dnsmasq?:IDnsmasqCf;
};

interface IConfSwitch{
    interface:string;
    wpasupplicant_path:string;

    hostapd:IHostapd;
    dnsmasq:IDnsmasq;
    init:boolean;
    redirect:boolean;
};


    let config:IConfSwitch = {
        interface: "wlan0",
        wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
        redirect: true,
        hostapd: { interface: "wlan0", wpa_passphrase: false, ssid: "hapd111" },
        dnsmasq: { interface: "wlan0" },
        init:false
    }


export = class HostapdSwitch{
config:IConfSwitch;
dnsmasq:{};
    constructor(options:IClassConf, init:boolean){
            merge(config, options)
            
                if (!pathExists.sync('/etc/default/hostapd')) {
        throw Error('no default conf file was founded for hostapd')
    }
    if (!config.hostapd.ssid) {
        throw Error('No ssid was provided')
    }
    if (!config.hostapd.wpa_passphrase) {
        throw Error('No wpa_passphrase was provided')
    }
    this.config = config;

    this.dnsmasq = new dnsmasqconf(config.dnsmasq);

    if (init) {
        hostapdconf(config.hostapd).then(function() {
            console.log('hostapd is now configured')
        });
    };
            
    };
    
    
    
host = function(e: any) {
    let dnsmasq = this.dnsmasq;
    let hostIp = dnsmasq.host;
    let cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && sleep 5';
    return new Promise(function(resolve, reject) {
        dnsmasq.setmode('host').then(function() {

            exec(cmd).then(function() {
                exec('iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination ' + hostIp + ':80 && iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination ' + hostIp + ':80').then(function() {
                    resolve({ mode: 'host', ip: hostIp })
                }).catch(function(err) {
                    verb(err, 'error', 'hostapd_switch ipfilter host switch')
                })
            }).catch(function(err) {
                verb(err, 'error', 'hostapd_switch executing host switch')
            })
        }).catch(function(err) {
            verb(err, 'error', 'hostapd_switch executing dnsmasq host switch')
        })
    })
};


    ap = function() {
        let dnsmasq = this.dnsmasq;
        let hostIp = dnsmasq.host;
        let cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up  && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done'
        return new Promise(function(resolve, reject) {
            dnsmasq.ap().then(function() {
                exec(cmd).then(function() {
                    resolve({ mode: 'ap', ip: hostIp })
                }).catch(function(err) {
                    verb(err, 'error', 'hostapd_switch executing ap switch')
                })
            }).catch(function(err) {
                verb(err, 'error', 'hostapd_switch executing ap switch')
            })
        })
    };

    client = function(testnetw, testint) {

        let dev = this.config.interface;
        let cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' -D wext && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';

        return new Promise(function(resolve, reject) {

            netw().then(function(n) {
                let todo = true;
                let ip = false;
                let gw = false;
                for (let ns = 0; ns < n.networks.length; ns++) {
                    if (n.networks[ns].interface == dev && n.networks[ns].ip && n.networks[ns].gateway) {
                        todo = false;
                        ip = n.networks[ns].ip;
                        gw = n.networks[ns].gateway;
                    }
                }
                if (todo) {
                    exec(cmd).then(function() {
                        if (testnetw) {
                            testconn(dev, testint).then(function(answer) {
                                resolve(answer)
                            }).catch(function(err) {
                                reject(err)
                            })
                        } else {
                            resolve('executed')

                        }

                    }).catch(function(err) {
                        verb(err, 'warn', 'hostapd_switch exec')
                        if (testnetw) {
                            testconn(dev, testint).then(function(answer) {
                                resolve(answer)
                            }).catch(function(err) {
                                reject(err)
                            })
                        } else {
                            resolve('executed')

                        }
                    })
                } else {
                    if (n.externalIp) {
                        resolve({
                            mode: 'client', ip: ip, gateway: gw, externalIp: n.externalIp
                        })
                    } else {
                        resolve({ mode: 'client', ip: ip, gateway: gw })
                    }
                }

            }).catch(function(err) {
                verb(err, 'error', 'hostapd_switch conf error')
            })
        })

    };
    
    
    
}






