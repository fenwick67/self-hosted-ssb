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
    icon:'🙂',
    color:'#f04124'
  },
  '/': {
    title:"Timeline",
    icon:"🐚",
    color:"#3273dc"
  },
  '/friends':{
    title:"Friends",
    icon:"😎",
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
