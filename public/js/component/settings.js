const Settings = Vue.component('settings-view',{
  data:function(){
    return {inviteCode:''};
  },
  template: `
    <container-view>

      <div class="box">
        <div class="subtitle">Add a Pub Invite</div>
        <div class="field has-addons">
          <p class="control is-expanded">
            <input v-model="inviteCode" class="input" type="text" placeholder="put invite code here">
          </p>
          <p class="control">
            <button @click="addInvite" class="button is-link">Submit Invite</button>
          </p>
        </div>
      </div>

      <div class="box">
        <change-password/>
      </div>
      
      <button class="button is-danger is-outlined is-fullwidth" @click="logout">Log Out</button>

    </container-view>
  `,
  methods:{
    logout:function(){
      window.localStorage['jwt']='';
      window.localStorage['userid']='';
      this.$router.push('/login');
    },
    addInvite:function(){

      window.authorizedFetch('/addInvite',{method:"PUT",body:this.inviteCode},function(er,result){
        if(er){
          alert(er);
        }
      })

    }
  },
 });
