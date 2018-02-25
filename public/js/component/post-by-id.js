function getThread(id,callback){

  var id = encodeURIComponent(id).replace('.','%2E');
  authorizedFetch(`/thread/${id}`,{},callback);
}

var postById = Vue.component('post-by-id',{
  template:`
  <container-view v-if="post">
    <div class="box">
      <div class="breakword">Viewing thread ID {{post.key}}</div>
    </div>
    <ssb-post :post="post"></ssb-post>
  </container-view>
  `,
  data:function(){
    return {id:'',post:null}
  },
  props:['feedid'],
  created(){
    if(this.feedid){
      this.id = this.feedid;
    }
    if(this.$route && this.$route.params.id ){
      this.id = this.$route.params.id;
    }
  },
  watch:{
    id:function(newVal,oldVal){
      getThread(this.id,(er,post)=>{
        if(er){throw er}
        this.post=post;
      })
    }
  }
})
