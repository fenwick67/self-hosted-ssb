var changePasswordView = Vue.component('change-password',{
  data:function(){
    return {
      password:'',
      newPassword:'',
      loading:false
    };
  },
  template:`
  <div>
    <h2 class="subtitle">Change Password</h2>
    <div class="field">
      <label class="label">Current Password
        <input class="input" type="password" placeholder="hopefully not 'password'" v-model="password"></input>
      </label>
    </div>
    <div class="field">
      <label class="label">New Password
        <input class="input" type="password" placeholder="hopefully not 'password'" v-model="newPassword"></input>
      </label>
    </div>
    <button class="button is-link" @click="changePassword">Submit New Password</button>
  </div>
  `,
  methods:{
    changePassword(){

      // try logging in!
      var obj = JSON.stringify({password:this.password,newPassword:this.newPassword});
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

        }else{
          throw(new Error(data));
        }
      }).catch(e=>{
        alert(e);
        console.log(e);
      });

    }
  }

});
