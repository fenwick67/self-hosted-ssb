Vue.component('ssb-avatar',{
  props:{
    src:{
      type:String,
      required:false
    },
    large:{
      type:Boolean,
      required:false
    },
    userid:{
      type:String,
      required:false
    }
  },
  data:function(){
    return { cacheBus:window.cacheBus, internalSrc: 'https://bulma.io/images/placeholders/128x128.png'}
  },
  watch:{
    src(to,from){
      this.internalSrc = to;
    }
  },
  template:`
  <p class="image avatar" :class="{'is-64x64':!large,'is-128x128':large}">
    <img :src="internalSrc||src">
  </p>
  `,
  created(){
    this.cacheBus = window.cacheBus
    if(this.src){
      this.internalSrc = this.src;
      return;
    }

    if (this.userid){
      var gotImage = i=>{
        this.internalSrc = window.hrefForBlobAddress(this.cacheBus.authors[this.userid].image);
      }

      if (this.cacheBus.authors[this.userid] && this.cacheBus.authors[this.userid].image){
        gotImage();
      }
      // compute the img src again when the author is recieved
      var v = this;
      this.cacheBus.$on('gotAuthor:'+this.userid,gotImage);
      this.cacheBus.$emit('requestAuthor',this.userid);

    }

  }
})
