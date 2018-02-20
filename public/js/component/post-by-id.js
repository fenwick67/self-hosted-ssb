function getThread(id,callback){

  var id = encodeURIComponent(id).replace('.','%2E');
  fetch(`/thread/${id}`).then(response=>{
    return response.json()
  }).then(posts=>{
    callback(null,posts);
  }).catch(e=>{
    console.error(e);
    callback(e);
  })
}

var postById = Vue.component('post-by-id',{
  template:`
  <div class="posts-container">
    <div class="posts">
      <div class="post-container">
        <ssb-post v-if="post" :post="post"></ssb-post>
      </div>
    </div>
  </div>
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
