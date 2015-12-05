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
    interface:'wlan0',
    wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'
  }

  config.hostapd={
    interface:config.interface
  }
    config.dnsmasq={
      interface:config.interface
  }

  merge(options,config)


  if(!pathExists.sync('/etc/default/hostapd')){
    throw Error('no default conf file was founded for hostapd')
  }
  if(!options.hostapd.ssid){
    throw Error('No ssid was provided')
  }
  if(!options.hostapd.wpa_passphrase){
    throw Error('No wpa_passphrase was provided')
  }


this.config=options;

  this.dnsmasq=new dnsmasqconf(options.dnsmasq);

  if(init){
    hostapdconf(options.hostapd).then(function(){
      console.log('hostapd is now configured')
    })
  }
};




HAPDSW.prototype.host=function(){
  var dnsmasq=this.dnsmasq;
  var hostIp=dnsmasq.host;
  var cmd='pkill wpa_supplicant ; ifconfig '+this.config.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.config.interface+' '+hostIp+' netmask 255.255.255.0 up'
  return new Promise(function(resolve,reject){
    dnsmasq.host().then(function(){
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


HAPDSW.prototype.ap=function(){
  var dnsmasq=this.dnsmasq;
  var hostIp=dnsmasq.host;
  var cmd='pkill wpa_supplicant ; ifconfig '+this.config.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.config.interface+' '+hostIp+' netmask 255.255.255.0 up'
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

  var dev=this.config.interface;
  var cmd='ifconfig '+dev+' down && sleep 2 ; pkill wpa_supplicant ;  dhclient -r '+dev+' ; systemctl stop hostapd ; systemctl stop dnsmasq ; sleep 2; ifconfig '+dev+' up && wpa_supplicant -B -i '+dev+' -c '+this.config.wpasupplicant_path+' -D wext && dhclient '+dev;

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
        exec(cmd).then(function(){
          if(testnetw){
            testconn(dev,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)
            })
          } else{
            resolve('executed')

          }

        }).catch(function(err){
          verb(err,'warn','hostapd_switch exec')
          if(testnetw){
            testconn(dev,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)
            })
          } else{
            resolve('executed')

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
