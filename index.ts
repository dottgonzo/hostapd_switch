
import * as Promise from "bluebird";
import * as pathExists from "path-exists";
import * as dnsmasqconf from "dnsmasq-conf";
import merge = require("json-add");
import testinternet = require('promise-test-connection');
import wpamanager = require('wpasupplicant-manager');

let netw = require("netw");
let verb = require('verbo');
let exec = require('promised-exec');
let hostapdconf = require("hostapdjs");


function testconn(d: string, testint?: boolean) {

    return new Promise<boolean>(function(resolve, reject) {
        netw().then(function(n) {
            let dev: any = false;
            let ip: any = false;
            let netw: { mode: string };
            for (let ns = 0; ns < n.networks.length; ns++) {
                if (n.networks[ns].interface == d) {
                    netw = n.networks[ns];
                    dev = d;
                    if (n.networks[ns].ip) {
                        ip = n.networks[ns].ip
                    }
                    //      if (n.networks[ns].gateway) {
                    //         gw = n.networks[ns].gateway
                    //    }
                }
            }
            if (!dev) {
                reject('no interface');
            } else if (!ip) {
                reject(dev + ' can\'t get an ip address');
                //  } else if (!gw) {
                //     reject(dev + ' has no gateway')
            } else {
                netw.mode = "client";
                if (testint) {
                    testinternet().then(function(a: { ip?: any }) {
                        if (a.ip) {
                            resolve(true);
                        } else {
                            resolve(true);
                        }
                    }).catch(function(err) {
                        reject(err);
                    })
                } else {
                    console.log("warn no internet");
                    resolve(true);
                }
            }

        }).catch(function(err) {
            reject('netw' + err);
        })
    })

}

interface IHostapd {
    interface: string;
    ssid: string;
    wpa_passphrase: any;
        fileconf:string;
};

interface IHostapdCf {
    driver?: string;
    ssid?: string;
    fileconf?:string;
    wpa_passphrase?:string;
};

interface IDnsmasq {
    interface: string;
};

interface IDnsmasqCf {
    interface?: string;
};

interface IClassOpt {
    interface?: string;
    wpasupplicant_path?: string;
    hostapd?: IHostapdCf;
    redirect?: boolean;
    dnsmasq?: IDnsmasqCf;
};

interface IClassConf {
    interface: string;
    wpasupplicant_path: string;
    hostapd: IHostapd;
    dnsmasq: IDnsmasq;
    init: boolean;
    redirect: boolean;
};


let config: IClassConf = {
    interface: "wlan0",
    wpasupplicant_path: "/etc/wpa_supplicant/wpa_supplicant.conf",
    redirect: true,
    hostapd: { interface: "wlan0", wpa_passphrase: false, ssid: "hapd111", fileconf:"/etc/default/hostapd" },
    dnsmasq: { interface: "wlan0" },
    init: false
};

interface IDnsModes {
    ap: IDnsMode;
    link: IDnsMode;
    host: IDnsMode
};

interface IDnsMode {
    noresolv: boolean,
    dns: [string],
    dhcp: {
        stop: number;
        start: number;
        lease: string;
    };
    hostIp: string,
    test: boolean,
    interface: any,
    address?: string
}



interface IDns {
        modes: IDnsModes;
    mode?: string;
    path:string;
        interface: any;
    test: boolean;
    dhcp: {
        stop: number;
        start: number;
        lease: string;
    };
    dns: [string];
    hostIp: string;
    ap:Function;
    host:Function;
    link:Function;
    setmode(string);
}


export = class HostapdSwitch extends wpamanager {
    config: IClassConf;
    dnsmasq: IDns;
    constructor(options: IClassOpt, init?: boolean) {
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
super(config.wpasupplicant_path)
        this.dnsmasq = new dnsmasqconf(config.dnsmasq);

        if (init) {
            hostapdconf(config.hostapd).then(function() {
                console.log('hostapd is now configured')
            });
        };

    };

    host(e?: any) {
        let dnsmasq = this.dnsmasq;
        let hostIp = dnsmasq.hostIp;
        let cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && sleep 5';
        return new Promise<boolean>(function(resolve, reject) {
            dnsmasq.setmode('host').then(function() {

                exec(cmd).then(function() {
                    exec('iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination ' + hostIp + ':80 && iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination ' + hostIp + ':80').then(function() {
                        resolve(true)
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


    ap(e?: any) {
        let dnsmasq = this.dnsmasq;
        let hostIp = dnsmasq.hostIp;
        let cmd = 'pkill wpa_supplicant ; ifconfig ' + this.config.interface + ' up  && systemctl restart hostapd ; systemctl restart dnsmasq && ifconfig ' + this.config.interface + ' ' + hostIp + ' netmask 255.255.255.0 up && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done'
        return new Promise<boolean>(function(resolve, reject) {
            dnsmasq.ap().then(function() {
                exec(cmd).then(function() {
                    resolve(true)
                }).catch(function(err) {
                    verb(err, 'error', 'hostapd_switch executing ap switch')
                })
            }).catch(function(err) {
                verb(err, 'error', 'hostapd_switch executing dnsmasq before ap switch')
            })
        })
    };

    client(testnetw?: boolean, testint?: boolean) {

        let dev = this.config.interface;
        let cmd = 'ifconfig ' + dev + ' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r ' + dev + ' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig ' + dev + ' up && wpa_supplicant -B -i ' + dev + ' -c ' + this.config.wpasupplicant_path + ' -D wext && dhclient ' + dev + ' && for i in $( iptables -t nat --line-numbers -L | grep ^[0-9] | awk \'{ print $1 }\' | tac ); do iptables -t nat -D PREROUTING $i; done';

        return new Promise<boolean>(function(resolve, reject) {

            netw().then(function(n) {

                    exec(cmd).then(function() {
                        if (testnetw) {
                            testconn(dev, testint).then(function(answer) {
                                resolve(answer)
                            }).catch(function(err) {
                                reject(err)
                            })
                        } else {
                            resolve(true)
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
                            resolve(true)
                        }
                    })

            }).catch(function(err) {
                verb(err, 'error', 'hostapd_switch conf error')
            })
        })

    };



}






