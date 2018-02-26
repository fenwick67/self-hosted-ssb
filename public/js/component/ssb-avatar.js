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
  var c = `hsla(${n1},60%,50%,0.7)`
  var c2 = `hsla(${n2},50%,60%,1.0)`
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
