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
    return { cacheBus:window.cacheBus }
  },
  computed:{
    computedSrc(){
      if (this.src){return this.src;}
      if(this.cacheBus.authors[this.userid] && this.cacheBus.authors[this.userid].image){
        return window.hrefForBlobAddress(this.cacheBus.authors[this.userid].image);
      }
      return 'https://bulma.io/images/placeholders/128x128.png';
    }
  },
  template:`
  <p class="image avatar" :class="{'is-64x64':!large,'is-128x128':large}">
    <img :src="computedSrc">
  </p>
  `,
  created(){
    if (this.userid && !this.src){
      if (this.cacheBus.authors[this.userid]){
        return;// computedSrc will be able to calculate it
      }

      // compute the img src again when the author is recieved
      var v = this;
      this.cacheBus.$on('gotAuthor:'+this.userid,function(a){
        v.$forceUpdate();
      });
      this.cacheBus.$emit('requestAuthor',this.userid);


    }
  }
})
