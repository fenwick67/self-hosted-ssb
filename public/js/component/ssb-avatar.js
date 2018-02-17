Vue.component('ssb-avatar',{
  props:{
    src:{
      type:String,
      required:true
    },
    large:{
      type:Boolean,
      required:false
    }
  },
  template:`
  <p class="image avatar" :class="{'is-64x64':!large,'is-128x128':large}">
    <img :src="src">
  </p>`,
})
