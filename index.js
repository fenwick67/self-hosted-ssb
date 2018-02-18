const express = require('express');
const party = require('ssb-party');
const ssbHelpers = require('./lib/ssb-helpers');

const serveStatic = require('serve-static');
const compression = require('compression');
const history = require('connect-history-api-fallback');

const parseJsonBody = require('body-parser').json()
const app = express();
var sbot = null;

// TODO.  Only run on localhost for now.
function ensureAuthenticated(req,res,next){
  return next(null);
}

app.use(compression({}))// defaults for now

// simple callbacky methods to get stuff

app.get('/entries',ensureAuthenticated,function(req,res,next){

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

app.get('/posts',ensureAuthenticated,function(req,res,next){

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

app.get('/friendsPosts',ensureAuthenticated,function(req,res,next){

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

app.get('/userPosts',ensureAuthenticated,function(req,res,next){

  var count = 100;
  var start = Infinity;
  var id='';

  if(req.query && req.query.count){
    count = Number(req.query.count);
  }
  if(req.query && req.query.start){
    start = Number(req.query.start);
  }
  if(req.query && req.query.id){
    id = req.query.id;
  }else{
    throw new Error('ID parameter is required')
  }

  ssbHelpers.getUserPosts(sbot,{id,start,count},function(er,results){
    if(er){return next(er);}
    res.status(200).json(results);
  })

});

app.put('/post',ensureAuthenticated,parseJsonBody,function(req,res,next){
  if(!req.body){
    return next(new Error('bad request body'))
  }

  ssbHelpers.createPost(sbot,req.body,function(er,post){
    if(er){
      return next(er);
    }

    res.status(200);
    return res.json(post);
  })

});

app.put('/like',ensureAuthenticated,parseJsonBody,function(req,res,next){
  if(!req.body){
    return next(new Error('bad request body'))
  }

  ssbHelpers.createLike(sbot,req.body,function(er,post){
    if(er){
      return next(er);
    }
    res.status(200);
    return res.json(post);
  })
})

app.get('/authorData/:id',ensureAuthenticated,function(req,res,next){
  ssbHelpers.getAuthorData(sbot,req.params.id,function(er,data){
    if(er){return next(er)}
    return res.json(data);
  })
})

app.get('/whoami',ensureAuthenticated,function(req,res,next){
  ssbHelpers.whoami(sbot,function(er,id){
    if(er){return next(er);}
    res.status(200);
    return res.send(id);
  })
})

// NOTE: cannot authenticate img requests 🤔
app.get('/blob/:id',function(req,res,next){

  var ct = 'text/plain';
  if(req.query.contenttype){
    ct = req.query.contenttype;
  }

  // blacklist certain content types
  var baddies = [
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/json',
    'text/ecmascript',
    'text/javascript',
    'text/json',
    'text/css'
  ];

  if (baddies.indexOf(ct.toLowerCase) > -1){
    return next(new Error('a malicious content-type was requested'))
  }

  if(!req.params.id){return next(new Error('missing blob ID'))}

  ssbHelpers.pipeBlobToStream(sbot,req.params.id,res);

})


// SPA fallback then serve static files
app.use(history());
app.use(serveStatic('public',{dotfiles:'deny'}))

//party then run the app

party(function(er,ssb){
  if(er){
    throw er;
  }

  // ready with ssb!
  console.log('ssb ready');
  sbot = ssb;


  app.listen(8080,'127.0.0.1',function(er){
    console.log('listenin on 8080 :)')
  })
});
