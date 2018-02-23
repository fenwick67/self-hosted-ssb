function getChannel(opts,callback){
  var opts = opts || {};
  var count = opts.count || 3;
  var id = opts.id;
  if(!id){throw new Error('need an ID')}
  var startTime = opts.startTime || Date.now();

  authorizedFetch(`/channelPosts/${id}?count=${count}&start=${startTime}`,{},callback);
}

var channelById = Vue.component('channel-by-id',{
  data:function(){
    return { posts: [], cursor:Infinity, loading:false, id:false };
  },
  params:['feedid'],
  template: `<post-list :posts="posts" :refresh="refresh" :more="more"></post-list>`,
  watch:{
    feedid(to,from){
      if(to){
        this.refresh(e=>{null;})
      }
    }
  },
  methods:{
    refresh(cb){
      this.cursor=Infinity;
      getChannel({id:this.id},(er,data)=>{
        if(er){return cb(er);}
        this.posts=[];
        data.forEach(p=>{
          this.posts.push(p)
          this.cursor = Math.min(p.timestamp,this.cursor)
        })
        cb(null,data);
      });
    }
    ,
    more(cb){
      getChannel({id:this.id,startTime:this.cursor},(er,data)=>{
        if(er){return cb(er);}
        data.forEach(p=>{
          this.cursor = Math.min(p.timestamp,this.cursor)
          this.posts.push(p)
        })
        cb(null,data);
      });
    }
  },
  created(){
    if(this.feedid){
      this.id = this.feedid;
    }
    if(this.$route && this.$route.params.id ){
      this.id = this.$route.params.id;
    }
  }
})
