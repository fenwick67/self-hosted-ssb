function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}

function getPosts(opts,callback){
  var opts = opts || {};
  var count = opts.count || 30;
  var startTime = opts.startTime || Date.now();

  fetch(`/posts?count=${count}&start=${startTime}`).then(response=>{
    return response.json()
  }).then(posts=>{
    callback(null,posts);
  }).catch(e=>{
    console.error(e);
    callback(e);
  })
}

function getFriendsPosts(opts,callback){
  var opts = opts || {};
  var count = opts.count || 30;
  var startTime = opts.startTime || Date.now();

  fetch(`/friendsPosts?count=${count}&start=${startTime}`).then(response=>{
    return response.json()
  }).then(posts=>{
    callback(null,posts);
  }).catch(e=>{
    console.error(e);
    callback(e);
  })
}

function getEntries(callback,opts){
  var opts = opts || {};
  var count = opts.count || 400;
  var startTime = opts.startTime || Date.now();

  fetch(`/all?count=${count}&start=${startTime}`).then(response=>{
    return response.json()
  }).then(entries=>{
    callback(null,entries);
  }).catch(e=>{
    console.error(e);
    callback(e);
  })
}

Vue.component('post-list',{
    template:`
    <div class="posts-container">
      <div class="posts">
        <div class="field">
          <input type="text" class="input" placeholder="Filter" v-model="search"></input>
        </div>
        <a class="button is-link is-large is-fullwidth" @click="requestRefresh">Refresh Posts</a>
        <div v-if="posts.length == 0">Loading...</div>
        <div v-for="post in filteredPosts" class="post-container" >
          <ssb-post :post="post"></ssb-post>
        </div>
        <a v-if="posts.length > 0" class="button is-large is-link is-fullwidth" @click="requestMore">More</a>
      </div>
    </div>`,
    props:['posts'],
    data:function(){
      return {search:''}
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
        this.$parent.$emit('requestRefresh');
      },
      requestMore(){
        this.$parent.$emit('requestMore');
      }
    }
})


Vue.component('ssb-post',{
  props:['post'],
  template:`
  <div class="box post">
      <article class="media">
        <figure class="media-left">
          <p class="image is-64x64">
            <img src="https://bulma.io/images/placeholders/128x128.png">
          </p>
        </figure>
        <div class="media-content">
          <div class="content">
            <p>
              <strong>{{  }}</strong>
              <span v-if="post.authorIsFriend">&nbsp;<span class="tag is-success">Following</span>&nbsp;</span>
              <small><a>{{post.author}}</a></small>
              <br>
              <span v-html="post.content.text" class="content"></span>
            </p>
          </div>
          <nav class="level is-mobile">
            <div class="level-left">
              <a class="level-item" aria-label="like">👍&#xFE0E;</a>
              <a class="level-item" aria-label="boost">🔃&#xFE0E;</a>
              <a class="level-item" aria-label="reply">↪️&#xFE0E;</a>
              <small>{{ age }}&nbsp;ago</small>
              <small v-if="post.content.channel">&nbsp;in&nbsp;<b>{{ post.content.channel }}</b></small>
            </div>
          </nav>
        </div>
      </article>
    </div>
  `,
  computed:{
    age(){
      return timeSince(this.post.timestamp)
    }
  }
})

const Public = {

  data:function(){
    return { posts: [], cursor:Infinity };
  },
  template: `<post-list :posts="posts"></post-list>`,
  created(){
    this.refresh()
    this.$on('requestRefresh',this.refresh)
    this.$on('requestMore',this.more)
  },
  methods:{
    refresh(){
      this.posts=[];
      getPosts({},(er,data)=>{
        if(er){console.error(er);}
        data.forEach(p=>{
          this.posts.push(p);
          this.cursor = Math.min(p.timestamp,this.cursor);
        })
      });
    },
    more(){
      getPosts({startTime:this.cursor},(er,data)=>{
        if(er){console.error(er);}
        data.forEach(p=>{
          this.posts.push(p)
          this.cursor = Math.min(p.timestamp,this.cursor);
        })
      });
    }
  }

}


const Friends = {
  data:function(){
    return { posts: [], cursor:Infinity };
  },
  template: `<post-list :posts="posts"></post-list>`,
  created(){
    this.refresh()
    this.$on('requestRefresh',this.refresh)
    this.$on('requestMore',this.more)
  },
  methods:{
    refresh(){
      this.posts=[];
      getFriendsPosts({},(er,data)=>{
        if(er){console.error(er);}
        data.forEach(p=>{
          this.posts.push(p)
          this.cursor = Math.min(p.timestamp,this.cursor)
        })
      });
    }
    ,
    more(){
      getFriendsPosts({startTime:this.cursor},(er,data)=>{
        if(er){console.error(er);}
        data.forEach(p=>{
          this.cursor = Math.min(p.timestamp,this.cursor)
          this.posts.push(p)
        })
      });
    }
  }
}


const Private = {

  data:function(){
    return { };
  },
  computed:{
    posts(){
      return globalPosts.filter(p=>p.isPrivate)
    }
  },
  template: `<post-list :posts="posts"></post-list>`

}

const NotFound = { template: '<p>Page not found</p>' }
const New = { template: '<p>New page</p>' }
const Mentions = { template: '<p>Mentions page</p>' }
const Settings = { template: '<p>Settings page</p>' }


// tabs and routing

var hash = {location:'#'};

const routes = {
  '#new': {
    component:New,
    title:"Compose",
    icon:"➕",
    color:"hsl(160,100%,40%)"
  },
  '#': {
    component:Public,
    title:"Public",
    icon:"🐚",
    color:"hsl(190,100%,40%)"
  },
  '#friends':{
    component:Friends,
    title:"Friends",
    icon:"😎",
    color:'hsl(220,80%,50%)'
  },
  '#private': {
    component:Private,
    title:"Private",
    icon:"🔒",
    color:"hsl(300,100%,40%)"
  },
  '#mentions': {
    component:Mentions,
    title:"Mentions",
    icon:"❗",
    color:"hsl(0,100%,40%)"
  },
  '#settings': {
    component:Settings,
    title:"Settings",
    icon:"⚙️",
    color:"hsl(200,0%,40%)"
  }
}

new Vue({
  el: '#page',
  data: {
    hash:hash
  },
  computed: {
    ViewComponent () {
      return routes[this.currentRoute]?routes[this.currentRoute].component:Home
    },
    currentRoute:function(){
      return this.hash.location;
    },
    currentRouteColor:function(){
      return routes[this.currentRoute]?routes[this.currentRoute].color||'#eee':'#eee';
    }
  },
  render (h) { return h(this.ViewComponent) }
})

new Vue({
  el:'#tabs',
  data:{
    routes:routes,
    hash:hash
  },
  computed:{
    currentRoute:function(){
      return hash.location;
    },
    currentRouteColor:function(){
      return routes[this.currentRoute]?routes[this.currentRoute].color||'#eee':'#eee';
    }
  },
  methods:{
    setHash(h){
      this.hash.location=h;
    }
  }
})
