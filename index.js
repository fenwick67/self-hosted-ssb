const express = require('express');
const party = require('ssb-party');
const ssbHelpers = require('./lib/ssb-helpers');

const serveStatic = require('serve-static');
const compression = require('compression');
const history = require('connect-history-api-fallback');

const parseJsonBody = require('body-parser').json()
const parsePlaintextBody = require('body-parser').text()
const app = express();

// passport
const passport = require('passport');
const jwt = require('jsonwebtoken')
const passportJWT = require("passport-jwt");
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

var sbot = null;
var login = require('./lib/login')


app.use(compression({}))// defaults for now

// Passport config
var jwtOptions = {
  jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey : login.getSessionSecretSync(),// TODO: this needs to change ASAP
  algorithms:['HS512']
}

// where the magic happens
passport.use(new JwtStrategy(jwtOptions,function(payload, done) {
    // it's fine
    return done(null,payload);
  }
));


/*
// TODO.  Only run on localhost for now.
function ensureAuthenticated(req,res,next){
  return next(null);
}
*/

var ensureAuthenticated = passport.authenticate('jwt', { session: false });


app.use(passport.initialize());
app.post('/login',parseJsonBody,function(req,res,next){
  var password;
  var newPassword;

  if(req.body.password && req.body.newPassword){
    password = req.body.password;
    newPassword = req.body.newPassword;
  }else if(req.body.password){
    password = req.body.password;
  }else{
    return next(new Error('password not provided'))
  }

  function passwordChecked(er,ok){
    if(er){
      res.status(500)
      res.send('error authenticating, please try again '+er);
      return;
    }else{
      if(ok){// password matched
        // NOW we need to check whoami to  get the userid and B Out
        ssbHelpers.whoami(sbot,function(er,id){
          if(er){
            res.status(500);
            res.send('server error while authenticating, please try again '+er);
            return;
          }
          var payload = {userid:id};
          var token = jwt.sign(payload, jwtOptions.secretOrKey, {algorithm:'HS512'});
          res.status(200);
          res.json({token: token, userid:id});
        })
      }else{// password didn't match
        res.status(401)
        res.send("Incorrect Login")
      }
    }
  }

  if (newPassword){
    // try change password
    login.changePassword(password,newPassword,passwordChecked);
  }else{
    // try login
    login.authorize(password,passwordChecked);
  }

});

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

app.get('/thread/:id',ensureAuthenticated,function(req,res,next){
  ssbHelpers.getThread(sbot,req.params.id,function(er,data){
    if(er){return next(er)}
    res.status(200);
    res.json(data);
  })
})

app.put('/addInvite',ensureAuthenticated,parsePlaintextBody,function(req,res,next){
  if(!req.body){
    return next(new Error('bad request body'))
  }

  ssbHelpers.addInvite(sbot,req.body,function(er){
    if(er){return next(er)}
    res.status(200).send();
  });
})

app.put('/follow',ensureAuthenticated,parsePlaintextBody,function(req,res,next){
  if(!req.body){
    return next(new Error('bad request body'))
  }

  ssbHelpers.follow(sbot,req.body,function(er){
    if(er){
      return next(er);
    }
    res.status(200);
    res.send();
  })
})

app.put('/unfollow',ensureAuthenticated,parsePlaintextBody,function(req,res,next){
  if(!req.body){
    return next(new Error('bad request body'))
  }

  ssbHelpers.unfollow(sbot,req.body,function(er){
    if(er){
      return next(er);
    }
    res.status(200);
    res.send();
  })
})

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

app.get('/channelPosts/:id',ensureAuthenticated,function(req,res,next){
  var count = 100;
  var start = Date.now() + 60*1000;
  var channel = req.params.id;

  if(req.query && req.query.count){
    count = Number(req.query.count);
  }
  if(req.query && req.query.start){
    start = Number(req.query.start);
  }

  ssbHelpers.getChannel(sbot,{start,count,channel},function(er,results){
    if(er){return next(er);}
    res.status(200).json(results);
  })
})

app.put('/profile',ensureAuthenticated,parseJsonBody,function(req,res,next){

  if(!req.body || !req.body.id || !req.body.value || !req.body.key){
    return next(new Error('bad request body'))
  }

  ssbHelpers.setProfileData(sbot,req.body,function(er){
    if(er){
      res.status(500).send(er);
    }else{
      res.status(200).send()
    }
  })
});

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


  app.listen(8080,'0.0.0.0',function(er){
    console.log('listenin on 8080 :)')
  })
});
