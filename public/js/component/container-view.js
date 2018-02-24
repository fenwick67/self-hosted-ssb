
// basically this is what all page components should be nested in
var containerView = Vue.component('container-view',{
  template:`
  <div class="container-view">
    <slot></slot>
  </div>
  `
})
