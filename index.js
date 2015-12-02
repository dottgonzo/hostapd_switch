var exec = require('promised-exec'),
Promise=require('promise'),
testinternet=require('promise-test-connection'),
netw=require('netw'),
waitfor=require('waitfor-promise'),
pathExists=require('path-exists'),
q=require('q'),
verb=require('verbo');


function WlSwConf(conf){

  return new Promise(function(resolve,reject){
    if(conf&&conf.wpasupplicant_path){
      var options=conf;

    } else{
      var options={
          wpasupplicant_path:'/etc/wpa_supplicant/wpa_supplicant.conf'
      };

    }

    if(!pathExists.sync(options.wpasupplicant_path)){

      reject('wpa_supplicant conf not specified')

    }

    exec('echo -n $(cat /etc/dnsmasq.conf|grep interface=|grep -v "#"|sed \'s/interface=//g\')').then(function(i){
      options.interface=i;

    }).then(function(){
      exec('echo -n $(cat /etc/dnsmasq.conf|grep dhcp-range|grep -v "#"|sed "s/dhcp-range=//g"|sed -s "s/,/ /g"|awk \'{print$(1)}\')').then(function(hostIp){
        options.hostIp=hostIp.split('.')[0]+'.'+hostIp.split('.')[1]+'.'+hostIp.split('.')[2]+'.1'
        resolve(options)
      }).catch(function(err){
        reject(err)
      })
    }).catch(function(err){
      reject(err)
    })

  })


}

function testconn(options,testint){

var fun=function(){
  return new Promise(function(resolve,reject){

  netw().then(function(n){
    var dev=false;
    var ip=false;
    var gw=false;
    var externalIp=false;
    for(ns=0;ns<n.networks.length;ns++){
      if(n.networks[ns].interface==options.interface){
        dev=options.interface
        if(n.networks[ns].ip){
          ip=n.networks[ns].ip
        }
        if(n.networks[ns].gateway){
          gw=[ns].gateway
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
      reject(dev+' can\'t has no gateway')
    } else{
      if(testint){
        testinternet().then(function(){
          resolve({mode:'client',ip:ip,gateway:gw,externalIp:externalIp})
        }).catch(function(err){
          reject(err)
        })
      } else{
        if(externalIp){
          resolve({mode:'client',ip:ip,gateway:gw,externalIp:externalIp})
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
  time:3000,
timeout:40000
})
}


module.exports = {
  settings:function(options){

    return WlSwConf(options)
  },

  ap:function(conf){
    return new Promise(function(resolve,reject){

      WlSwConf(conf).then(function(options){


        var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+options.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+options.interface+' '+options.hostIp+' netmask 255.255.255.0 up'

        return exec(cmd).then(function(){
          resolve({mode:'ap'})
        }).catch(function(err){
          verb(err,'error','hostapd_switch executing ap switch')
        })

      }).catch(function(err){
        verb(err,'error','hostapd_switch conf')
      })

    })
  },

  client:function(conf,testnetw,testint){

    return new Promise(function(resolve,reject){

      WlSwConf(conf).then(function(options){


        var cmd='ifconfig '+options.interface+' down && dhclient -r '+options.interface+' && systemctl stop hostapd && systemctl stop dnsmasq; ifconfig '+options.interface+' up && wpa_supplicant -B -i '+options.interface+' -c '+options.wpasupplicant_path+' -D wext && dhclient '+options.interface;

        return exec(cmd).then(function(){
          if(testnetw){
            testconn(options,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)

            })
          }


        }).catch(function(err){
          if(testnetw){
            testconn(options,testint).then(function(answer){
              resolve(answer)
            }).catch(function(err){
              reject(err)

            })
          }




        })

      }).catch(function(err){
        verb(err,'error','hostapd_switch conf error')
      })

    })
  }

};
