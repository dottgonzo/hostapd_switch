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




var wswitch={

configure:function(){
WlSwConf()
}
//
// ap:function(){
//   return new Promise(function(resolve,reject){
//
//   WlSwConf().then(function(){
//
//
//   var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+this.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.interface+' '+this.hostIp+' netmask 255.255.255.0 up'
// return exec(cmd).then(function(){
//   resolve({success:true,mode:'ap'})
// }).catch(function(err){
//   verb(err,'error','hostapd_switch')
// })
//
// }).catch(function(err){
//   verb(err,'error','hostapd_switch')
// })
//
//   })
// },
//
// client:function(){
//
//     return new Promise(function(resolve,reject){
//
//     WlSwConf().then(function(){
//
//
//     var cmd='ifconfig '+this.interface+' down && dhclient -r '+this.interface+' && systemctl stop hostapd && systemctl stop dnsmasq && ifconfig '+this.interface+' up && wpa_supplicant -B -i '+this.interface+' -c /etc/wpa_supplicant/wpa_supplicant.conf -D wext && dhclient'+this.interface
//
//
//   return exec(cmd).then(function(){
//     resolve({success:true,mode:'client'})
//   }).catch(function(err){
//     verb(err,'error','hostapd_switch')
//   })
//
//   }).catch(function(err){
//     verb(err,'error','hostapd_switch')
//   })
//
//     })
// }

};

module.exports=wswitch
