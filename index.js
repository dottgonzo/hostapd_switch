var exec = require('promised-exec'),
Promise=require('promise'),
verb=require('verbo');


function WlSwConf(){


    return new Promise(function(resolve,reject){

    exec('cat /etc/dnsmasq.conf|grep interface=|grep -v "#"|sed \'s/interface=//g\'').then(function(i){
    options.interface=i;

    }).then(function(){
      exec('echo $(cat /etc/dnsmasq.conf|grep dhcp-range|grep -v "#"|sed "s/dhcp-range=//g"|sed -s "s/,/ /g"|awk \'{print$(1)}\'| sed "s/\./ /g"|awk \'{print$(1)}\').$(cat /etc/dnsmasq.conf|grep dhcp-range|grep -v "#"|sed "s/dhcp-range=//g"|sed -s "s/,/ /g"|awk \'{print$(1)}\'| sed "s/\./ /g"|awk \'{print$(2)}\').$(cat /etc/dnsmasq.conf|grep dhcp-range|grep -v "#"|sed "s/dhcp-range=//g"|sed -s "s/,/ /g"|awk \'{print$(1)}\'| sed "s/\./ /g"|awk \'{print$(3)}\').1').then(function(hostIp){
        WlanSwitch.hostIp=hostIp
    resolve(options)
      }).catch(function(err){
        reject(err)
      })
    }).catch(function(err){
      reject(err)
    })

    })


}

WlanSwitch function(){

return WlSwConf()

}

WlanSwitch.prototype.ap=function(){
  return new Promise(function(resolve,reject){

  WlSwConf().then(function(){


  var cmd='pkill wpa_supplicant; sleep 2 && ifconfig '+this.interface+' up && systemctl start hostapd && systemctl start dnsmasq && ifconfig '+this.interface+' '+this.hostIp+' netmask 255.255.255.0 up'
return exec(cmd).then(function(){
  resolve({success:true,mode:'ap'})
}).catch(function(err){
  verb(err.'error','hostapd_switch')
})

}).catch(function(err){
  verb(err.'error','hostapd_switch')
})

  })
}

WlanSwitch.prototype.client=function(){


  return new Promise(function(resolve,reject){

  WlSwConf().then(function(){


  var cmd='ifconfig '+this.interface+' down && dhclient -r '+this.interface+' && systemctl stop hostapd && systemctl stop dnsmasq && ifconfig '+this.interface+' up && wpa_supplicant -B -i '+this.interface+' -c /etc/wpa_supplicant/wpa_supplicant.conf -D wext && dhclient'+this.interface


return exec(cmd).then(function(){
  resolve({success:true,mode:'client'})
}).catch(function(err){
  verb(err.'error','hostapd_switch')
})

}).catch(function(err){
  verb(err.'error','hostapd_switch')
})

  })
}
module.exports=WlanSwitch
