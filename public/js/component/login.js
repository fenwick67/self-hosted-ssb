var loginView = Vue.component('login-el',{
  data:function(){
    return {
      password:'',
      newPassword:'',
      changingPassword:false,
      loading:false
    };
  },
  template:`
  <container-view>
    <h2 class="subtitle">{{changingPassword?"Change Password":"Login"}}</h2>
    <div class="field">
      <label class="label">{{changingPassword?'Old Password':'Password'}}
        <input class="input" type="password" placeholder="hopefully not 'password'" v-model="password"></input>
      </label>
    </div>
    <div class="field" v-if="changingPassword">
      <label class="label">New Password
        <input class="input" type="password" placeholder="hopefully not 'password'" v-model="newPassword"></input>
      </label>
    </div>
    <button class="button is-link" @click="login">Submit</button>
    <button class="button" @click="toggleChanging">{{!changingPassword?'Change Password':'Actually, just log in'}}</button>
  </container-view>
  `,
  methods:{
    login(){
      if (this.changingPassword){
        alert('not done yet');
      }else{
        // try logging in!
        var obj = JSON.stringify({password:this.password});
        this.password='';
        this.newPassword='';
        var resok = false;

        fetch('/login',{method:'POST',body:obj,headers:{'Content-Type':'application/json'}}).then(res=>{
          resok = res.ok;
          if(resok){
            return res.json();
          }else{
            return res.text();
          }
        }).then(data=>{
          if(resok){
            localStorage['jwt'] = data.token;
            localStorage['userid'] = data.userid;
            this.$router.push('/');
          }else{
            throw(new Error(data));
          }
        }).catch(e=>{
          alert(e);
          console.log(e);
        });

      }
    },
    toggleChanging(){
      this.changingPassword = !this.changingPassword;
    }
  }

});
