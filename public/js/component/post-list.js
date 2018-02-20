
Vue.component('post-list',{
    template:`
    <div class="posts-container">
      <div class="posts">
        <div class="post-container">
          <slot></slot>
        </div>
        <div class="field">
          <input type="text" class="input" placeholder="Filter" v-model="search"></input>
        </div>
        <button :disabled="loading" :class="{'is-loading':loading}" class="button is-link is-large is-fullwidth" @click="requestRefresh">Refresh Posts</button>
        <div v-for="post in filteredPosts" class="post-container" >
          <ssb-post :post="post" :key="post.key"></ssb-post>
        </div>
        <button :disabled="loading" :class="{'is-loading':loading}" v-if="posts.length > 0 && !noMore" class="button is-large is-link is-fullwidth" @click="requestMore">
          Load More
        </button>
        <span class="level" v-if="noMore"><span class="level-item">That's all for now!</span></span>
      </div>
    </div>`,
    props:['posts','more','refresh','defer'],
    data:function(){
      return {search:'', loading:true, noMore:false, scrollListener:null}
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

      this.scrollListener = document.addEventListener('scroll',e=>{
        if(!this.noMore && !this.loading && getScrollFraction() > 0.9){
          this.requestMore();
        }
      });

    },
    destroyed(){
      if(this.scrollListener){
        document.removeEventListener(this.scrollListener);
      }
    }
})
