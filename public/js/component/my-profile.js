const myProfile = Vue.component('my-profile',{
  template:`
    <ssb-profile v-if="id.length > 0" :feedid="id"></ssb-profile>
  `,
  created(){

    // get my ID
    // TODO this should be part of the login process
    var resok = false;
    fetch('/whoami',{}).then(res=>{
      resok = res.ok;
      return res.text();
    }).then(dat=>{
      if (!resok){
        throw new Error(dat)
      }else{
        this.id = dat;
      }
    }).catch(e=>{
      console.error(e);
    })

  },
  data(){
    return {id:''};
  }
})
