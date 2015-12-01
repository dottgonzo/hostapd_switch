var exec = require('promised-exec'),
Promise=require('promise'),
testinternet=require('promise-test-connection'),
netw=require('netw'),
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
  var deferred = q.defer();




  setTimeout(function() {

    netw.data().then(function(n){
      console.log(n)
      console.log(options)
      var dev=false
      for(ns=0;ns<n.networks.length;ns++){
        if(n.networks[ns].dev==options.interface && n.networks[ns].connected){
          dev=true
        }
      }
      if(!dev){

        deferred.reject('no device')

      } else{

        if(testint){
          testinternet().then(function(){
            deferred.resolve({success:true,mode:'client',connected:true,internet:true})
          }).catch(function(err){
            deferred.reject(err)
          })


        } else{
          deferred.resolve({success:true,mode:'client',connected:true})
        }
      }
      console.log('RUNNING')



    }).catch(function(err){
      deferred.reject(err)


    })

  }, 30000);


  return deferred.promise;


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
          resolve({success:true,mode:'ap'})
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


        var cmd='ifconfig '+options.interface+' down && dhclient -r '+options.interface+' && systemctl stop hostapd && systemctl stop dnsmasq && ifconfig '+options.interface+' up && wpa_supplicant -B -i '+options.interface+' -c '+wpasupplicant_path+' -D wext && dhclient'+options.interface

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
