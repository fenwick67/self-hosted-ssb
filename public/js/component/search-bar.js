Vue.component('search-bar',{
  data(){
    return {query:''}
  },
  template:`
  <container-view>
    <div class="field has-addons">
      <p class="control is-expanded">
        <input v-model="query" class="input" type="text" placeholder="Enter a ref here">
      </p>
      <p class="control">
        <button @click="search" :disabled="!valid" class="button is-link">
          Go
        </button>
      </p>
    </div>
  </container-view>
  `,
  methods:{
    search(){
      var url = window.hrefForSsb(this.query);
      this.$router.push(url);
    }
  },
  computed:{
    valid(){
      return window.hrefForSsb(this.query);
    }
  }

})
