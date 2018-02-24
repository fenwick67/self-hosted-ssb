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
      <article class="media" :class="{'post':!child}">
        <a class="media-left" @click="showAuthor" >
          <ssb-avatar :src=" authorInfo.image?hrefForBlobAddress(authorInfo.image):'https://bulma.io/images/placeholders/128x128.png' "></ssb-avatar>
        </a>
        <div class="media-content">
          <span class="">
            <span class="is-size-3">{{authorInfo.name}}</span>
            <small v-if="isMe">(you)</small>
            <a @click="showAuthor" :title="post.author">{{post.author.slice(0,10)}}&hellip;</a>
            <span v-if="authorInfo.isFriend" class="level-item tag is-success">Friend</span>
            </span>
          </span>
          <div class="content">
            <small v-if="!child && parentPostId">In thread: <a :href="parentPostLink">{{parentPostId.slice(0,10)}}&hellip;</a></small>
            <span v-html="post.content.text" class="content"></span>
            <span v-for="url in imageUrls">
              <img :src="url"></img>
            </span>
          </div>
          <nav class="level is-mobile">
            <div class="level-left">
              <button @click="like" class="level-item button" aria-label="like" :disabled="everLiked" :class="{'is-link':everLiked}">
                Like&nbsp;({{nLikes}})
              </button>
              <button class="level-item button is-outlined" aria-label="reply" @click="reply">Reply</button>
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
