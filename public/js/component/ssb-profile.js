
function getUserPosts(opts,callback){
  var opts = opts || {};
  var id = opts.id;
  if (!opts.id){
    return callback(new Error('missing an ID to get posts for'))
  }

  var count = opts.count || 20;
  var start = opts.start || Infinity;

  authorizedFetch(`/userPosts?count=${count}&start=${start}&id=${encodeURIComponent(id)}`,{},callback)
}

const ssbProfile = Vue.component('ssb-profile',{
  props:{
    feedid:{
      required:false,
      type:String
    }
  },
  data:function(){
    return {
      cacheBus:window.cacheBus,
      id:'',
      posts:[],
      cursor:Infinity,
      author:{}
    }
  },
  watch:{
    feedid(newVal,oldVal){
      console.log('feedid set to '+newVal);
      if (!newVal){
        return;
      }
      this.id = newVal;
      this.whenGotId();
    },
    '$route' (to, from) {
      if(this.$route && this.$route.params.id ){
        this.id = this.$route.params.id;
        this.whenGotId();
      }
    }
  },
  template:`
    <post-list :more="more" :posts="posts" :refresh="refresh" :defer="!this.id">
      <div class="post">
          <article class="media box">

            <div class="media-content">
              <div class="post-header">
                <a>
                  <ssb-avatar size="large" :userid="id"/>
                </a>
                <span v-if="author.name" class="is-size-2">{{author.name}}</span>
                <span>
                  <button @click="unfollow" v-if= "author.isFriend && !isMe" class="button is-success">Following</button>
                  <button @click="follow" v-if="!author.isFriend && !isMe" class="button is-dark">Not Following</button>
                </span>
              </div>
              <div class="breakword">{{id}}</div>


              <div class="content">
                <p v-if="author.description" v-html="author.description"></p>
              </div>

            </div>
          </article>
      </div>
    </post-list>
  `,
  methods:{
    more(cb){
      getUserPosts({id:this.id,start:this.cursor},(er,data)=>{
        if(er){return cb(er);}
        data.forEach(p=>{
          this.cursor = Math.min(p.sequence,this.cursor)
          this.posts.push(p)
        })
        cb(null,data);
      });
    },
    refresh(cb){
      getUserPosts({id:this.id},(er,data)=>{
        if(er){return cb(er);}
        this.posts=[];
        data.forEach(p=>{
          this.cursor = Math.min(p.sequence,this.cursor)
          this.posts.push(p)
        })
        cb(null,data);
      });
    },
    whenGotId(){
      // fetch author info and set my author to that
      if (this.cacheBus.authors[this.id]){
        this.author = this.cacheBus.authors[this.id];
        return;
      }

      this.cacheBus.$emit('requestAuthor',this.id);
      var v = this;
      this.cacheBus.$on('gotAuthor:'+this.id,function(a){
        v.$forceUpdate();
        v.author = a;
      });

    },
    hrefForBlobAddress(addr){
      return window.hrefForBlobAddress(addr);
    },
    follow(){
      if(!confirm('Are you sure you want to follow this user?')){return}

      authorizedFetch('/follow',{method:"PUT",body:this.id},(er)=>{
        if(er){alert(er);return;}
        this.author.isFriend = true;
      })
    },
    unfollow(){
      if(!confirm('Are you sure you want to unfollow this user?')){return}

      authorizedFetch('/unfollow',{method:"PUT",body:this.id},(er)=>{
        if(er){alert(er);return;}
        this.author.isFriend = false;
      })
    },
    block(){
      if(!confirm('Are you sure you want to block this user?')){return}

      authorizedFetch('/block',{method:"PUT",body:this.id},(er)=>{
        if(er){alert(er);return;}
        this.author.isBlocked = true;
      })
    },
    unblock(){
      if(!confirm('Are you sure you want to unblock this user?')){return}

      authorizedFetch('/unblock',{method:"PUT",body:this.id},(er)=>{
        if(er){alert(er);return;}
        this.author.isBlocked = false;
      })
    }
  },
  created(){
    if(this.feedid){
      this.id = this.feedid;
      this.whenGotId();
    }
    if(this.$route && this.$route.params.id ){
      this.id = this.$route.params.id;
      this.whenGotId();
    }
  },
  computed:{
    isMe:function(){
      return this.id == localStorage['userid']
    }
  }
});
