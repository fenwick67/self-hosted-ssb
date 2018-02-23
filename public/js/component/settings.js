const Settings = Vue.component('settings-view',{
  data:function(){
    return {};
  },
  template: `
    <container-view>
      <button class="button is-link is-outlined is-fullwidth" @click="logout">Log Out</button>
    </container-view>
  `,
  methods:{
    logout:function(){
      window.localStorage['jwt']='';
      window.localStorage['userid']='';
      this.$router.push('/login');
    }
  },
 });
