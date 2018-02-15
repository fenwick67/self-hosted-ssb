const express = require('express');
const party = require('ssb-party');
const serveStatic = require('serve-static');
const ssbHelpers = require('./lib/ssb-helpers');
const compression = require('compression')

const app = express();
var sbot = null;



app.use(serveStatic('public',{dotfiles:'deny'}))
app.use(compression({}))// defaults for now

// simple callbacky methods to get stuff

app.get('/entries',function(req,res,next){

  var n = 100;
  var start = Date.now() + 60*1000;

  if(req.query && req.query.count){
    n = Number(req.query.count);
  }
  if(req.query && req.query.start){
    start = Number(req.query.start);
  }


  ssbHelpers.getEntries(sbot,{start:start,count:n},function(er,results){
    if(er){return next(er);}
    res.status(200).json(results);
  })

});

app.get('/posts',function(req,res,next){

  var n = 100;
  var start = Date.now() + 60*1000;

  if(req.query && req.query.count){
    n = Number(req.query.count);
  }
  if(req.query && req.query.start){
    start = Number(req.query.start);
  }

  ssbHelpers.getPosts(sbot,{start:start,count:n},function(er,results){
    if(er){return next(er);}
    res.status(200).json(results);
  })

});

app.get('/friendsPosts',function(req,res,next){

  var n = 100;
  var start = Date.now() + 60*1000;

  if(req.query && req.query.count){
    n = Number(req.query.count);
  }
  if(req.query && req.query.start){
    start = Number(req.query.start);
  }

  ssbHelpers.getFriendsPosts(sbot,{start:start,count:n},function(er,results){
    if(er){return next(er);}
    res.status(200).json(results);
  })

});

//party then run the app

party(function(er,ssb){
  if(er){
    throw er;
  }

  // ready with ssb!
  console.log('ssb ready');
  sbot = ssb;


  app.listen(8080,function(er){
    console.log('listenin on 8080 :)')
  })
});
