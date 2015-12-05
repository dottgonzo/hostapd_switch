var exec = require('promised-exec'),
Promise=require('promise'),
testinternet=require('promise-test-connection'),
netw=require('netw'),
merge=require('json-add'),
hostapdconf=require('hostapdjs'),
dnsmasqconf=require('dnsmasq-conf'),
waitfor=require('waitfor-promise'),
pathExists=require('path-exists'),
verb=require('verbo');

function testconn(d,testint){

  var fun=function(){
    return new Promise(function(resolve,reject){
      netw().then(function(n){
        var dev=false;
        var ip=false;
        var gw=false;
        var externalIp=false;
        for(ns=0;ns<n.networks.length;ns++){
          if(n.networks[ns].interface==d){
            dev=options.interface;
            if(n.networks[ns].ip){
              ip=n.networks[ns].ip
            }
            if(n.networks[ns].gateway){
              gw=n.networks[ns].gateway
            }
            if(n.externalIp){
              externalIp=n.externalIp
            }
          }
        }
        if(!dev){
          reject('no interface')
        } else if (!ip){
          reject(dev+' can\'t get an ip address')
        } else if (!gw){
          reject(dev+' has no gateway')
        } else{
          if(testint){
            testinternet().then(function(){
              if(externalIp){
                resolve({
                  mode:'client',ip:ip,gateway:gw,externalIp:externalIp
                })
              } else{
                resolve({mode:'client',ip:ip,gateway:gw})
              }
            }).catch(function(err){
              reject(err)
            })
          } else{
            if(externalIp){
              resolve({
                mode:'client',ip:ip,gateway:gw,externalIp:externalIp
              })
            } else{
              resolve({mode:'client',ip:ip,gateway:gw})
            }
          }
        }

      }).catch(function(err){
        reject(err)
      })
    })
  }

  return waitfor.pre(fun,{
    time:5000,
    timeout:40000
  })
}


function HAPDSW(options,init){

  var config={
    hostapd_path:'/etc/hostapd/hostapd.conf', // only to show this is default in hostapdapp
    dnsmasq_path:'/etc/dnsmasq.conf', // only to show this is default in dnsmasqapp
    wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'
  }
  merge(options,config)
  if(!pathExists.sync('/etc/default/hostapd')){
    throw Error('no default conf file was founded for hostapd')
  }
  if(!options || typeof(options)!='object'){
    throw Error('Type Error, provide a valid json object')
  }
  if(!options.interface){
    throw Error('No configuration interface was provided')
  }
  if(!options.ssid){
    throw Error('No ssid was provided')
  }
  if(!options.wpa_passphrase){
    throw Error('No wpa_passphrase was provided')
  }
  for(var c=0;c<Object.keys(options).length;c++){
    this[Object.keys(options)[c]]=options[Object.keys(options)[c]];
  }
  options.path=options.dnsmasq_path;

  this.dnsmasq=new dnsmasqconf(options);

  if(init){
    options.path=options.hostapd_path;
    hostapdconf(options).then(function(){
      console.log('hostapd is now configured')
    })
  }
};



HAPDSW.prototype.host=function(){

  var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+this.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.interface+' '+this.dnsmasq.host+' netmask 255.255.255.0 up'

  return new Promise(function(resolve,reject){


    // iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination localhost:3000
    // iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination localhost:3000


    return exec(cmd).then(function(){
      resolve({mode:'ap',ip:options.hostIp})
    }).catch(function(err){
      verb(err,'error','hostapd_switch executing ap switch')
    })



  })
},

HAPDSW.prototype.ap=function(){
  var hostIp=this.dnsmasq.host;
  var dnsmasq=this.dnsmasq;
  var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+this.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.interface+' '+hostIp+' netmask 255.255.255.0 up'
  return new Promise(function(resolve,reject){
    dnsmasq.ap().then(function(){
      exec(cmd).then(function(){
        resolve({mode:'ap',ip:hostIp})
      }).catch(function(err){
        verb(err,'error','hostapd_switch executing ap switch')
      })
    }).catch(function(err){
      verb(err,'error','hostapd_switch executing ap switch')
    })
  })
},

HAPDSW.prototype.client=function(testnetw,testint){

  var dev=this.interface;
  var cmd='ifconfig '+dev+' down ; sleep 2 && dhclient -r '+dev+' && systemctl stop hostapd && systemctl stop dnsmasq && ifconfig '+dev+' up && wpa_supplicant -B -i '+dev+' -c '+this.wpasupplicant_path+' -D wext && dhclient '+dev;

  return new Promise(function(resolve,reject){

    netw().then(function(n){
      var todo=true;
      var ip=false;
      var gw=false;
      for(ns=0;ns<n.networks.length;ns++){
        if(n.networks[ns].interface==dev&&n.networks[ns].ip&&n.networks[ns].gateway){
          todo=false;
          ip=n.networks[ns].ip;
          gw=n.networks[ns].gateway;
        }
      }
      if(todo){
        return exec(cmd).then(function(){
          if(testnetw){
            testconn(dev,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)

            })
          }

        }).catch(function(err){
          verb(err,'warn','hostapd_switch exec')
          if(testnetw){
            testconn(dev,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)
            })
          }
        })
      } else{
        if(n.externalIp){
          resolve({mode:'client',ip:ip,gateway:gw,externalIp:n.externalIp})
        } else{
          resolve({mode:'client',ip:ip,gateway:gw})
        }
      }
    })
  }).catch(function(err){
    verb(err,'error','hostapd_switch conf error')
  })


};
module.exports = HAPDSW
