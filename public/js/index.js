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

window.hrefForSsb= function(s){
  var s = s;
  if(s.indexOf('#') == 0){
    return window.hrefForChannel(s);
  }else if(s.indexOf('@') == 0){
    return window.hrefForUserid(s);
  }else if(s.indexOf('&') == 0){
    return window.hrefForBlobAddress(s);
  }else{
    // not a SSB URL at all!
    return s;
  }
}

function getPosts(opts,callback){
  var opts = opts || {};
  var count = opts.count || 20;
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
  var count = opts.count || 20;
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



const Public = {
  data:function(){
    return { posts: [], cursor:Infinity, loading:false };
  },
  template: `<post-list :posts="posts" :refresh="refresh" :more="more"></post-list>`,
  methods:{
    refresh(cb){
      this.posts=[];
      this.cursor=Infinity;
      getPosts({},(er,data)=>{
        if(er){cb(er);}
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
        if(er){cb(er);}
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
      this.posts=[];
      this.cursor=Infinity;
      getFriendsPosts({},(er,data)=>{
        if(er){cb(er);}
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
        if(er){cb(er);}
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

const NotFound = { template: '<p>Page not found</p>' }
const Mentions = { template: '<p>Mentions page</p>' }
const Settings = { template: '<p>Settings page</p>' }


// tabs and routing ///////////////////////////////////////

const tabInfo = {
  '/new': {
    title:"Compose",
    icon:"➕",
    color:"hsl(160,100%,40%)"
  },
  '/': {
    title:"Public",
    icon:"🐚",
    color:"hsl(190,100%,40%)"
  },
  '/friends':{
    title:"Friends",
    icon:"😎",
    color:'hsl(220,80%,50%)'
  },
  '/private': {
    title:"Private",
    icon:"🔒",
    color:"hsl(300,100%,40%)"
  },
  '/mentions': {
    title:"Mentions",
    icon:"❗",
    color:"hsl(0,100%,40%)"
  },
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
  { path:'/profile/:id',component: ssbProfile}
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

      fetch('/authorData/'+encodeURIComponent(id),{method:"GET"})
      .then(res=>{
        ok = res.ok;
        if(ok){
          return res.json()
        }else{
          return res.text()
        }
      })
      .then(data=>{
        if(!ok){
          er = new Error(data);
          throw er;
        }else{
          // stick it in the global store
          this.authors[id] = data;
          this.$emit('gotAuthor:'+id,data);
        }
      })
      .catch(e=>{
        // retry later
        this.requestedAuthors[id] = false;
      });
    }
  },
  created(){
    // register listeners
    this.$on('requestAuthor',id=>{
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
  }
})
