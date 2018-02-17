/*

This component should handle loading avatars likes usernames and files

*/

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
  if (interval >= 1) {// >= because "100 seconds" looks dumb
    return interval==1?'a minute':(interval+ " minutes");
  }
  return Math.floor(seconds) + " seconds";
}

Vue.component('ssb-post',{
  props:['post'],
  data:function(){
    return {
      username:'',
      userAvatar:'',
      likes:[],
      cacheBus:window.cacheBus,
      authorInfo:{}
    }
  },
  template:`
  <div class="box post">
      <article class="media">
        <a class="media-left" @click="showAuthor" >
          <ssb-avatar :src=" authorInfo.image?hrefForBlobAddress(authorInfo.image):'https://bulma.io/images/placeholders/128x128.png' "></ssb-avatar>
        </a>
        <div class="media-content">
          <div class="content">
            <p>
              <strong v-if="authorInfo.name">
                <a class="has-text-black" @click="showAuthor">{{authorInfo.name}}</a>
                <br>
              </strong>
              <small><a @click="showAuthor">{{post.author}}</a></small>
              <span v-if="post.authorIsFriend">&nbsp;<span class="tag is-success">Following</span>&nbsp;</span>
              <br>
              <span v-html="post.content.text" class="content"></span>
              <span v-for="url in imageUrls">
                <img :src="url"></img>
              </span>
            </p>
          </div>
          <nav class="level is-mobile">
            <div class="level-left">
              <a class="level-item" aria-label="like">👍&#xFE0E;</a>
              <a class="level-item" aria-label="boost">🔃&#xFE0E;</a>
              <a class="level-item" aria-label="reply">↪️&#xFE0E;</a>
              <small>{{ age }}&nbsp;ago</small>
              <small v-if="post.content.channel">&nbsp;in&nbsp;<a :href="hrefForChannel(post.content.channel)">#{{ post.content.channel }}</a></small>
            </div>
          </nav>
        </div>
      </article>
    </div>
  `,
  computed:{
    age(){
      return timeSince(this.post.timestamp)
    },
    imageUrls(){
      var mentions = (this.post && this.post.content && this.post.content.mentions) || [];
      var urls = mentions.map(this.imageUrlForMention).filter(u=>u);
      return urls;
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
    }
  },
  created(){
    // fetch author info for this post (if it doesn't exist)
    if(!this.post.author){return;}
    if (this.cacheBus.authors[this.post.author]){
      this.authorInfo = this.cacheBus.authors[this.post.author];
      return;
    }
    this.cacheBus.$emit('requestAuthor',this.post.author);
    var v = this;
    this.cacheBus.$on('gotAuthor:'+this.post.author,function(e){
      v.$forceUpdate();
      v.authorInfo = e;
    });
  }
})
