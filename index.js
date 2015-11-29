var exec = require('promised-exec'),
Promise=require('promise'),
verb=require('verbo');


function WlSwConf(){

var options={};
    return new Promise(function(resolve,reject){

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




module.exports = {
settings:function(){

return WlSwConf()
},

ap:function(){
  return new Promise(function(resolve,reject){

  WlSwConf().then(function(options){


  var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+options.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+options.interface+' '+options.hostIp+' netmask 255.255.255.0 up'

 return exec(cmd).then(function(){
  resolve({success:true,mode:'ap'})
}).catch(function(err){
  verb(err,'error','hostapd_switch')
})

}).catch(function(err){
  verb(err,'error','hostapd_switch')
})

  })
},

client:function(){

    return new Promise(function(resolve,reject){

    WlSwConf().then(function(options){


    var cmd='ifconfig '+options.interface+' down && dhclient -r '+options.interface+' && systemctl stop hostapd && systemctl stop dnsmasq && ifconfig '+options.interface+' up && wpa_supplicant -B -i '+options.interface+' -c /etc/wpa_supplicant/wpa_supplicant.conf -D wext && dhclient'+options.interface

  return exec(cmd).then(function(){
    resolve({success:true,mode:'client'})
  }).catch(function(err){
    resolve({success:true,mode:'ap'})
  })

  }).catch(function(err){
    verb(err,'error','hostapd_switch')
  })

    })
}

};
