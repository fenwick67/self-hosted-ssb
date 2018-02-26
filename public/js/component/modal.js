window.modalManager = new Vue({
  el:'#modal',
  methods:{
      showImage(url,alt){
        this.src = url;
        if(alt){this.alt=alt}
        this.open=true;
      },
      hide(){
          this.open=false;
      }
  },
  data:{
      open:false,
      src:'',
      alt:''
  }

});