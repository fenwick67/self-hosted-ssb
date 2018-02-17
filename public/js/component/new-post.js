
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

const NewPost = {
  data:function(){
    return {
      channel:'',
      text:'',
      loading:false
    }
  },
  template: `
  <div class="posts-container">
    <div class="posts">
      <div class="field">
        <label class="label">Channel (optional)
          <input type="text" class="input" placeholder="new-people" v-model="channel"></input>
        </label>
      </div>
      <div class="field">
        <label class="label">Text
          <textarea class="textarea" placeholder="How was your day?" v-model="text"></textarea>
        </label>
      </div>
      <a class="button is-link is-large is-fullwidth" @click="submit" :disabled="loading">Submit</a>
    </div>
  </div>`,
  methods:{
    submit(){
      var postObj = {text:this.text};
      if(this.channel){
        if(this.channel.indexOf('#') == 0){
          // silly humans
          this.channel = this.channel.slice(1);
        }
        postObj.channel = this.channel;
      }

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
    }
  }
 }
