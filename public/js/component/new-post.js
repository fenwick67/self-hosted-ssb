
// new post /////////////////////////////////////////////

const putPost = function(post,done){
  var ok;
  var er;
  var resData = null;

  fetch('/post',{
    method:'PUT',
    body:JSON.stringify(post),
    headers:{
      'Content-Type': 'application/json',
    }
  }).then(res=>{
    ok = res.ok;
    if(ok){
      return res.json();
    }else{
      return res.text();
    }
  }).then(data=>{
    if (ok){
      resData = data;
    }else{
      er = new Error('Bad response from API: \n'+data);
    }
  }).catch(e=>{
    er = e;
  }).finally(v=>{
    done(er,resData)
  });

}


const postEditor = Vue.component('post-editor',{
  props:{
    'root':{
      type:String
    },
    'branch':{
      type:String
    },
    'mentionAuthor':{
      type:String
    },
    'parentChannel':{
      type:String
    },
    'cancellable':{
      type:Boolean
    }
  },
  data:function(){
    return {
      channel:'',
      text:'',
      loading:false
    }
  },
  computed:{
    myUserid(){
      return window.localStorage['userid']
    }
  },
  template: `
    <div class="media">
      <div class="media-left">
        <ssb-avatar :userid="myUserid"></ssb-avatar>
      </div>
      <div class="media-content">
        <div class="field" v-if="!root">
          <label class="label">Channel (optional)
            <input type="text" class="input" placeholder="new-people" v-model="channel"></input>
          </label>
        </div>
        <div class="field">
          <label class="label"><span v-if="!root">Text</span>
            <textarea class="textarea" :placeholder="root?'Write your reply here!':'How was your day?'" v-model="text"></textarea>
          </label>
        </div>
        <div class="field is-grouped">
          <div class="control">
          <a class="button is-link is-fullwidth" @click="submit" :disabled="loading">Submit</a>
            </div>
          <div class="control">
            <a v-if="cancellable" class="button is-link is-fullwidth is-danger" @click="cancel" :disabled="loading">Cancel</a>
          </div>
        </div>
      </div>
    </div>`,
  methods:{
    submit(){
      var postObj = {text:this.text};
      if(this.channel){
        postObj.channel = this.channel;
      }

      // TODO figure out why ssbc puts a `reply` object on here
      if(this.root){
        postObj.root = this.root;
      }
      if(this.branch){
        postObj.branch = this.branch;
      }
      if(this.parentChannel){
        postObj.channel = this.parentChannel;
      }

      // channel shouldn't have a hashtag in it really
      if(postObj.channel && postObj.channel.indexOf('#') == 0){
        // silly humans
        postObj.channel = postObj.channel.slice(1);
      }

      // mention the parent posts author
      if(this.mentionAuthor){
        postObj.reply = {};
        postObj.reply[this.branch]=this.mentionAuthor;
      }

      console.log(postObj);

      this.loading = true;
      putPost(postObj,(er)=>{
        this.loading = false;
        this.channel='';
        this.text='';
        if(!er){
          this.flashSuccess();
        }else{
          alert(er);
        }
      })
    },
    flashSuccess(){
      alert('successfully created post')
    },
    cancel(){
      this.$emit('cancel')
    }
  }
});


// new post page is simple
const NewPost = {
  template:`
  <div class="posts-container">
    <div class="posts">
      <post-editor></post-editor>
    </div>
  </div>
  `
}
