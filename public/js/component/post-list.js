
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
