
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

// basically this is what all page components should be nested in
var containerView = Vue.component('container-view',{
  template:`
  <div class="container-view">
    <slot></slot>
  </div>
  `
})
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

// new post /////////////////////////////////////////////

const putPost = function(post,done){
  var ok;
  var er;
  var resData = null;

  authorizedFetch('/post',{
    method:'PUT',
    body:JSON.stringify(post),
    headers:{
      'Content-Type': 'application/json',
    }
  },done);

}


const postEditor = Vue.component('post-editor',{
  props:{
    'root':{
      type:String
    },
    'branch':{
      type:String
    },
    'mentionAuthor':{
      type:String
    },
    'parentChannel':{
      type:String
    },
    'cancellable':{
      type:Boolean
    }
  },
  data:function(){
    return {
      channel:'',
      text:'',
      loading:false
    }
  },
  computed:{
    myUserid(){
      return window.localStorage['userid']
    }
  },
  template: `
    <div class="media">
      <div class="media-left">
        <ssb-avatar :userid="myUserid"></ssb-avatar>
      </div>
      <div class="media-content">
        <div class="field" v-if="!root">
          <label class="label">Channel (optional)
            <input type="text" class="input" placeholder="new-people" v-model="channel"></input>
          </label>
        </div>
        <div class="field">
          <label class="label"><span v-if="!root">Text</span>
            <textarea class="textarea" :placeholder="root?'Write your reply here!':'How was your day?'" v-model="text"></textarea>
          </label>
        </div>
        <div class="field is-grouped">
          <div class="control">
          <a class="button is-primary is-fullwidth" @click="submit" :disabled="loading || text.length < 1">Submit</a>
            </div>
          <div class="control">
            <a v-if="cancellable" class="button is-link is-fullwidth is-danger" @click="cancel" :disabled="loading">Cancel</a>
          </div>
        </div>
      </div>
    </div>`,
  methods:{
    submit(){
      var postObj = {text:this.text};
      if(this.channel){
        postObj.channel = this.channel;
      }

      // TODO figure out why ssbc puts a `reply` object on here
      if(this.root){
        postObj.root = this.root;
      }
      if(this.branch){
        postObj.branch = this.branch;
      }
      if(this.parentChannel){
        postObj.channel = this.parentChannel;
      }

      // channel shouldn't have a hashtag in it really
      if(postObj.channel && postObj.channel.indexOf('#') == 0){
        // silly humans
        postObj.channel = postObj.channel.slice(1);
      }

      // mention the parent posts author
      if(this.mentionAuthor){
        postObj.reply = {};
        postObj.reply[this.branch]=this.mentionAuthor;
      }

      console.log(postObj);

      this.loading = true;
      putPost(postObj,(er)=>{
        this.loading = false;
        this.channel='';
        this.text='';
        if(!er){
          this.flashSuccess();
        }else{
          alert(er);
        }
      })
    },
    flashSuccess(){
      alert('successfully created post')
    },
    cancel(){
      this.$emit('cancel')
    }
  }
});


// new post page is simple
const NewPost = {
  template:`
  <container-view>
    <post-editor></post-editor>
  </container-view>
  `
}
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

Vue.component('post-list',{
    template:`
    <container-view>
      <slot></slot>
      ${/*// not sure if I should really have a refresh or filter button.
        <button :disabled="loading" :class="{'is-loading':loading}" class="button is-link is-fullwidth" @click="requestRefresh">Refresh Posts</button>
        <div class="">
          <input type="text" class="input" placeholder="Filter" v-model="search"></input>
        </div>
      */''}
      <div v-for="post in filteredPosts" class="" >
        <ssb-post :post="post" :key="post.key"></ssb-post>
      </div>
      <button :disabled="loading" :class="{'is-loading':loading}" v-if="!noMore" class="button is-link is-fullwidth" @click="requestMore">
        Load More
      </button>
      <span class="level" v-if="noMore"><span class="level-item">That's all for now!</span></span>
    </container-view>`,
    props:['posts','more','refresh','defer'],
    data:function(){
      return {search:'', loading:true, noMore:false, scrollInterval:null}
    },
    watch:{
      defer:function(newVal,oldVal){
        if(newVal && !oldVal){
          this.requestRefresh();
        }
      }
    },
    computed:{
      reversedPosts:function(){
        if(this.posts && Array.isArray(this.posts)){
          return this.posts.reverse();
        }else{
          return [];
        }
      },
      filteredPosts:function(){
        var query = this.search.toLowerCase();
        return this.posts.filter(p=> !this.search || JSON.stringify(p).toLowerCase().indexOf(query) > -1)
      }
    },
    methods:{
      requestRefresh(){
        this.loading = true;
        this.refresh(er=>{
          if(er){alert(er)}
          this.loading = false;
          this.noMore = false;
        })
      },
      requestMore(){
        this.loading = true;
        this.more((er,morePosts)=>{
          if(er){alert(er)}
          this.loading = false;
          if(!morePosts || morePosts.length < 1){
            this.noMore = true;
          }
        })
      }
    },
    created(){
      if (!this.defer){
        this.requestRefresh();
      }
      // also register scroll listener!
      function getScrollFraction(){
        var se = document.scrollingElement;
        return se.scrollTop/(se.scrollHeight-se.clientHeight);
      }
      var checkPosition = ()=>{
        if(!this.noMore && !this.loading && getScrollFraction() > 0.7){
          this.requestMore();
        }
      }
      this.scrollInterval = setInterval(checkPosition,100)

    },
    destroyed(){
      if(this.scrollInterval){
        clearInterval(this.scrollInterval);
      }
    }
})
Vue.component('search-bar',{
  data(){
    return {query:''}
  },
  template:`
  <container-view>
    <div class="field has-addons">
      <p class="control is-expanded">
        <input v-model="query" class="input" type="text" placeholder="Enter a ref here">
      </p>
      <p class="control">
        <button @click="search" :disabled="!valid" class="button is-primary">
          Go
        </button>
      </p>
    </div>
  </container-view>
  `,
  methods:{
    search(){
      var url = window.hrefForSsb(this.query);
      this.$router.push(url);
    }
  },
  computed:{
    valid(){
      return window.hrefForSsb(this.query);
    }
  }

})
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
function genPlaceholder(userid){
  // get a color for a userid
  var n = 13;
  var l=userid.length;
  for(var i = 0; i < l; i ++){
    n= n*userid.charCodeAt(i)*(i+1);
  }

  var n1 = 360*((n % 1111)/1111);
  var n2 = 360*((n % 3634)/3634);
  var rot = 360*((n % 926)/926);
  var w = 8 + 20 * ((n % 381)/381);
  var w2 = 2*w;
  var c = `hsla(${n1}deg,60%,50%,0.7)`
  var c2 = `hsla(${n2}deg,50%,60%,1.0)`
  return `background-image:repeating-linear-gradient(${rot-90}deg, transparent 0%, transparent ${w}%, ${c} ${w}%, ${c} ${w2}%), repeating-linear-gradient(${rot}deg, transparent 0%, transparent ${w}%, ${c2} ${w}%, ${c2} ${w2}%)`;
}

Vue.component('ssb-avatar',{
  props:{
    src:{
      type:String,
      required:false
    },
    size:{
      type:String,
      required:false
    },
    userid:{
      type:String,
      required:false
    }
  },
  data:function(){
    return { cacheBus:window.cacheBus, internalSrc: '', isFriend:false}
  },
  computed:{
    sizeClass(){
      if (this.size == 'small'){
        return 'is-32x32'
      }else if (this.size == 'large'){
        return 'is-128x128'
      }else{
        return 'is-64x64'
      }
    },
    computedStyle(){
      var base = ''
      if (!this.userid || this.src || this.internalSrc){
        return base;
      }else{
        return base+genPlaceholder(this.userid);
      }
    }
  },
  watch:{
    src(to,from){// in case src is updated out of band
      this.internalSrc = to;
    }
  },
  template:`
  <span class="image avatar" :class="sizeClass+(isFriend?' is-friend':'') " :style="computedStyle">
    <img :src="internalSrc">
  </span>
  `,
  created(){
    this.cacheBus = window.cacheBus
    if(this.src){
      this.internalSrc = this.src;
      return;
    }

    if (this.userid){

      var checkImageReady = ()=>{
        if (this.cacheBus.authors[this.userid] && this.cacheBus.authors[this.userid].image){
          this.internalSrc = window.hrefForBlobAddress(this.cacheBus.authors[this.userid].image);
          this.isFriend = !!this.cacheBus.authors[this.userid].isFriend;
          return true;
        }
        return false;
      }

      if (!checkImageReady()){
        // compute the img src again when the author is recieved
        var v = this;
        this.cacheBus.$on('gotAuthor:'+this.userid,checkImageReady);
        this.cacheBus.$emit('requestAuthor',this.userid);
      }

    }

  }
})
/*

This component should handle loading avatars likes usernames and files

*/

function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + " yrs";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " mos";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hrs";
  }
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {// >= because "100 seconds" looks dumb
    return interval==1?'1 min':(interval+ " mins");
  }
  return Math.floor(seconds) + " secs";
}


function likePost(post,done){

  var cb = done;

  if (arguments.length == 0){throw new Error('must pass params to like a post');return;}
  if (!cb){cb = function(){}}

  var ok = false;

  var id = post.key;
  if(!id){
    throw new Error('WTF why cant I get an ID in here')
  }

  var entry = {
    "type": "vote",
    "vote": {
      "link": id,
      "value": 1,              // unlike is similar, but value===0 and expression is "Unlike"
      "expression": "Like"
    }
  };

  if (post.channel){
    entry.channel = post.channel;
  }

  // create a new entry
  authorizedFetch('/like',{
    method:'PUT',
    body:JSON.stringify(entry),
    headers:{
      'Content-Type': 'application/json',
    }
  },cb);

}

Vue.component('ssb-post',{
  props:{
    'post':{type:Object},
    'child':{type:Boolean}
  },
  data:function(){
    return {
      username:'',
      userAvatar:'',
      cacheBus:window.cacheBus,
      authorInfo:{},
      likedInSession:false,
      replying:false
    }
  },
  template:`
      <article class="media" :class="{'post':!child,'reply':child,'box':!child}">
        <div class="media-content">

          <div class="post-header">
            <a class="" @click="showAuthor" >
              <ssb-avatar :userid="post.author"/>
            </a>
            <span class="">
                <span class="is-size-4">{{authorInfo.name}}</span>
                <small v-if="isMe">(you)</small>
                <span v-if="authorInfo.isFriend" class="tag is-success">Following</span>
            </span>
            <a @click="showAuthor" :title="post.author">{{post.author.slice(0,10)}}&hellip;</a>
          </div>

          <div class="content">
            <small v-if="!child && parentPostId">In thread: <a :href="parentPostLink">{{parentPostId.slice(0,10)}}&hellip;</a></small>
            <span v-html="post.content.text" class="content"></span>
            <span v-for="url in imageUrls">
              <img :src="url"></img>
            </span>
          </div>
          <nav class="level is-mobile">
            <div class="level-left">
              <button @click="like" class="level-item button is-primary" aria-label="like" :disabled="everLiked" :class="{'is-link':everLiked}">
                Like&nbsp;({{nLikes}})
              </button>
              <button class="level-item button is-link" aria-label="reply" @click="reply">Reply</button>
              <span class="level-item">{{ age }}</span>
              <a class="level-item" v-if="post.content.channel && !child" :href="hrefForChannel(post.content.channel)">#{{ post.content.channel }}</a>
              <br>
            </div>
          </nav>
          <post-editor v-if="replying"
            :root="post.content&&post.content.root?post.content.root:post.key"
            :branch="post.key"
            :mentionAuthor="post.author"
            :parentChannel="post.content.channel||null"
            cancellable
            v-on:cancel="cancelReply"
          ></post-editor>
          <span v-if="replies.length > 0">
            <h2 class="subtitle">Replies:</h2>
            <ssb-post v-for="reply in replies" :post="reply" :key="reply.key" child></ssb-post>
          </span>

        </div>
      </article>
  `,
  computed:{
    isMe(){
      return window.localStorage['userid'] == this.post.author;
    },
    age(){
      return timeSince(this.post.timestamp)
    },
    imageUrls(){
      var mentions = (this.post && this.post.content && this.post.content.mentions) || [];
      var urls = mentions.map(this.imageUrlForMention).filter(u=>u);
      return urls;
    },
    metadata(){
      return (this.post && this.post._metadata)?this.post._metadata:{};
    },
    likes(){

      if(this.post._metadata && this.post._metadata.links){
        var usersLiked = [];
        var likes = [];

        this.post._metadata.links.filter(l=>{// TODO account for unvotes duplicates etc
          return l.rel == 'vote' && l.value && l.value.content && l.value.content.vote && typeof l.value.content.vote.value == 'number';
        }).forEach(l=>{// links only
          var s = l.source
          if (l.value.content.vote.value == 1){// like
            if(usersLiked.indexOf(s) === -1){
              usersLiked.push(s);
              likes.push(l);
            }
          }else if (l.value.content.vote.value == 0){// unlike?
            var  idx=usersLiked.indexOf(s)
            if(idx != -1){
              usersLiked.splice(idx,1);
              likes.splice(idx,1);
            }
          }

        });

        return likes;

      }
      // otherwise nope
      return [];
    },
    nLikes(){
      return this.likes.length + (this.likedInSession?1:0);
    },
    replies(){
      if(this.metadata && this.metadata.links){
        return this.metadata.links.filter(l=>{
          return l.rel == 'root' && l.value && l.value.content && l.value.content.type && l.value.content.type == 'post';
        }).map(l=>{
          l.value.key = l.key;// this is needed for replies to work!
          return l.value
        }).sort((a,b)=>{
          return a.timestamp - b.timestamp;
        })
      }else{
        return [];
      }
    },
    likedInThePast(){
      if(this.likedInSession){// liked from this sessoin
        return true;
      }
      // liked in the past on the SSB log
      const userid = localStorage['userid'];// TODO this should be saved on login et cetera
      return this.likes.filter(like=>{
        return like.source === userid;
      }).length > 0;

    },
    everLiked(){
      return this.likedInThePast || this.likedInSession;
    },
    parentPostId(){
      return this.post && this.post.content && this.post.content.root;
    },
    parentPostLink(){
      return this.parentPostId && window.hrefForSsb(this.parentPostId);
    }
  },
  methods:{
    imageUrlForMention(m){
      if(!m){return}
      return m &&
        m.link &&
        ( // is it an image?
          ( m.type && typeof m.type=='string' && m.type.toLowerCase().indexOf('image') > -1) || // mimetype
          ( m.name && typeof m.name=='string' && ( // filename checks out
              m.name.toLowerCase().indexOf('jpeg') > -1 ||
              m.name.toLowerCase().indexOf('svg') > -1 ||
              m.name.toLowerCase().indexOf('bmp') > -1 ||
              m.name.toLowerCase().indexOf('gif') > -1 ||
              m.name.toLowerCase().indexOf('tiff') > -1 ||
              m.name.toLowerCase().indexOf('png') > -1
            )
          )
        ) && this.hrefForBlobAddress(m.link);
    }
    ,
    hrefForBlobAddress(addr){
      return `/blob/${ encodeURIComponent(addr) }`
    },
    showAuthor(){
      this.$router.push(window.hrefForUserid(this.post.author))
    },
    hrefForChannel(c){
      return window.hrefForChannel(c);
    },
    like(){
      if (this.everLiked){
        console.info('you already liked this');
        return;
      }
      this.likedInSession = true;
      likePost(this.post);
    },
    reply(){
      this.replying = true;// this should open the reply editor
    },
    cancelReply(){
      this.replying = false;
    }
  },
  created(){
    // cancel replying when the post editor close button is pressed
    this.$on('cancelEdit',this.cancelReply);

    // fetch author info for this post (if it doesn't exist)
    if(!this.post.author){return;}
    if (this.cacheBus.authors[this.post.author]){
      this.authorInfo = this.cacheBus.authors[this.post.author];
      return;
    }
    var v = this;
    this.cacheBus.$on('gotAuthor:'+this.post.author,function(e){
      v.$forceUpdate();
      v.authorInfo = e;
    });
    this.cacheBus.$emit('requestAuthor',this.post.author);



  }
})

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
window.hrefForUserid = function(id){
  var id = id;
  return `/profile/${encodeURIComponent(id).replace('.','%2E')}`
}
window.hrefForChannel = function(c){
  var c = c;
  if(c.indexOf('#') == 0){
    c=c.slice(1);
  }
  return `/channel/${ encodeURIComponent(c) }`
}
window.hrefForBlobAddress = function(addr){
  return `/blob/${ encodeURIComponent(addr) }`
}
window.hrefForThread = function(id){
  return `/post/${encodeURIComponent(id).replace('.','%2E')}`
}

window.hrefForSsb= function(s){
  var s = s;
  if(s.indexOf('#') == 0){
    return window.hrefForChannel(s);
  }else if(s.indexOf('@') == 0){
    return window.hrefForUserid(s);
  }else if(s.indexOf('&') == 0){
    return window.hrefForBlobAddress(s);
  }else if(s.indexOf('%') == 0){
    return window.hrefForThread(s);
  }else{
    // not a SSB URL at all!
    return false;
  }
}

// wrap window.fetch with our JWT
window.authorizedFetch = function(url,options,done){

  var done = done || function(){console.warn('you should probably have a callback for this operation');console.log(arguments);}
  var opts = JSON.parse(JSON.stringify(options));
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer '+localStorage['jwt'];

  var resok = false;
  var response;
  fetch(url,opts).then(res=>{
    response = res;
    resok = res.ok;
    return res.text();
  }).then(data=>{
    if(!resok){
      if (response.status === 401){
        router.push('/login')
      }
      return done(new Error(data));
    }
    var ret = data;
    try{ret = JSON.parse(data)}
    catch(e){ret=data;}
    return done(null,ret);
  })

}

function getPosts(opts,callback){
  var opts = opts || {};
  var count = opts.count || 5;
  var startTime = opts.startTime || Date.now();
  window.authorizedFetch(`/posts?count=${count}&start=${startTime}`,{},callback);
}

function getFriendsPosts(opts,callback){
  var opts = opts || {};
  var count = opts.count || 10;
  var startTime = opts.startTime || Date.now();
  window.authorizedFetch(`/friendsPosts?count=${count}&start=${startTime}`,{},callback);
}

function getEntries(callback,opts){
  var opts = opts || {};
  var count = opts.count || 400;
  var startTime = opts.startTime || Date.now();
  window.authorizedFetch(`/all?count=${count}&start=${startTime}`,{},callback);
}



const Public = {
  data:function(){
    return { posts: [], cursor:Infinity, loading:false };
  },
  template: `<post-list :posts="posts" :refresh="refresh" :more="more"></post-list>`,
  methods:{
    refresh(cb){
      this.cursor=Infinity;
      getPosts({},(er,data)=>{
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
      getPosts({startTime:this.cursor},(er,data)=>{
        if(er){return cb(er);}
        data.forEach(p=>{
          this.cursor = Math.min(p.timestamp,this.cursor)
          this.posts.push(p)
        })
        cb(null,data);
      });
    }
  }
}


const Friends = {
  data:function(){
    return { posts: [], cursor:Infinity, loading:false };
  },
  template: `<post-list :posts="posts" :refresh="refresh" :more="more"></post-list>`,
  methods:{
    refresh(cb){
      this.cursor=Infinity;
      getFriendsPosts({},(er,data)=>{
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
      getFriendsPosts({startTime:this.cursor},(er,data)=>{
        if(er){return cb(er);}
        data.forEach(p=>{
          this.cursor = Math.min(p.timestamp,this.cursor)
          this.posts.push(p)
        })
        cb(null,data);
      });
    }
  }
}


const Private = {

  data:function(){
    return { posts:[] };
  },
  computed:{},
  template: `<post-list :posts="posts" :refresh="refresh" :reload="reload"></post-list>`,
  methods:{
    reload(){},
    refresh(){}
  }

}

const NotFound = { template: '<container-view>Page not found</container-view>' }
const Mentions = { template: '<container-view>Mentions page</container-view>' }


// tabs and routing ///////////////////////////////////////

const tabInfo = {
  '/new': {
    title:"New",
    icon:"➕",
    color:"#43ac6a"
  },
  '/me':{
    title:'Me',
    icon:'👤',
    color:'#f04124'
  },
  '/': {
    title:"Timeline",
    icon:"🐚",
    color:"#3273dc"
  },
  '/friends':{
    title:"Friends",
    icon:"👥",
    color:'#008cba'
  },
/*
'/private': {
    title:"Private",
    icon:"🔒",
    color:"hsl(300,50%,40%)"
  },

  '/mentions': {
    title:"Mentions",
    icon:"❗",
    color:"hsl(0,50%,40%)"
  },
  */
  '/settings': {
    title:"Settings",
    icon:"⚙️",
    color:"hsl(200,0%,40%)"
  }
}

const routes = [
  { path:"/settings", component: Settings },
  { path:"/new",component: NewPost },
  { path:"/",component: Public },
  { path:"/friends",component: Friends },
  { path:"/private",component: Private },
  { path:"/mentions",component: Mentions },
  { path:'/profile/:id',component: ssbProfile},
  { path:'/me',component:myProfile},
  { path:'/post/:id', component:postById },
  { path:'/channel/:id',component:channelById},
  { path:'/login',component:loginView}
]

const router = new VueRouter({ routes,mode:'history' });

// author info by ID
window.cacheBus = new Vue({
  data:{
    authors:{},
    requestedAuthors:{}
  },
  methods:{
    fetchAuthorById(id){
      if(!id){console.error('no ID passed to fetchAuthorById')}
      if (this.requestedAuthors[id]){// somebody already asked for this.  Just wait for the event to fire.
        return;
      }
      var ok = false;
      var er = false;
      this.requestedAuthors[id] = true;

      window.authorizedFetch('/authorData/'+encodeURIComponent(id),{method:"GET"},(er,data)=>{
        if(er){throw er};
        this.authors[id] = data;
        this.$emit('gotAuthor:'+id,data);

      })
    }
  },
  created(){
    // register listeners
    this.$on('requestAuthor',id=>{
      this.fetchAuthorById(id);
    })

    this.$on('forceRequestAuthor',id=>{
      this.requestedAuthors[id]={};
      this.fetchAuthorById(id);
    })

  }
});

new Vue({
  el: '#app',
  router,
  data: {
    tabInfo
  },
  computed: {
    routeColor(){
      var tab = this.tabInfo[this.$route.path];
      if (!tab){tab = this.tabInfo['/']}
      return tab.color;
    }
  },
  created(){
    // get this user's data
    var resok = false;
    var res = null;

    window.authorizedFetch('/whoami',{},(er,who)=>{
      if(er){
        this.$router.push('/login');// log me in
      }else{
        window.cacheBus.fetchAuthorById(who);// look me up
      }
    })

  }
});
