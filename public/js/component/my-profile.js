const myProfile = Vue.component('my-profile',{
  template:`
    <ssb-profile v-if="id.length > 0" :feedid="id"></ssb-profile>
  `,
  created(){
    this.id = localStorage['userid'];
  },
  data(){
    return {id:''};
  }
})
