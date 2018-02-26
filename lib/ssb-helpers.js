const pull = require('pull-stream');
const collect = require('pull-stream/sinks/collect');
const take = require('pull-stream/throughs/take');
const filter = require('pull-stream/throughs/filter');
const map = require('pull-stream/throughs/map');
const asyncMap = require('pull-stream/throughs/async-map');
const drain = require('pull-stream/sinks/drain');
const reduce = require('pull-stream/sinks/reduce');
const markDown = require('ssb-markdown');

const async = require('async');

const sanitize = require('sanitize-html');

const fixEmojis = require('./fix-emojis')

var domain = 'localhost:8080'
var imageDomain = 'localhost:8081'

exports.configure = function(opts){
  // set some variables
  if(opts.domain){
    domain = opts.domain;
  }
  if(opts.imageDomain){
    imageDomain = opts.imageDomain;
  }
}


// get author info for an author ID
// based on entries about themself
exports.getAuthorData = function(sbot,authorId,done){

  var _author = {id:authorId};

  // about should have a value.content and one or more of...
  // about.value.content.[name or image or description]
  function reducer(author,about){

    if (about && about.value && about.value.content){
      if(about.value.content.name && typeof about.value.content.name == 'string'){
        author.name = about.value.content.name;
      }
      if(about.value.content.description && typeof about.value.content.description == 'string'){
        author.description = about.value.content.description
      }
      // images sometimes are a SSB ref and sometimes are a String
      if(about.value.content.image && about.value.content.image.link && typeof about.value.content.image.link == 'string'){
        author.image = about.value.content.image.link;
      }
      if(about.value.content.image && typeof about.value.content.image == 'string'){
        author.image = about.value.content.image;
      }
    }

    //console.log(about);
    return author;

  }

  pull(
    sbot.links({
      source: authorId,
      dest: authorId,
      rel: 'about',
      values:true
    }),
    reduce(reducer,_author,function(er,author){
      if (er){return done(er);}
      if(typeof author !== 'undefined' && typeof author.description == 'string'){
        author.description = sanitize(parseMd(author.description));
      }

      // finally, are they my friend?
      sbot.friends.hops({hops: 1,graph:'follow'}, function(er,hops){
        if (er){return done(er)}

        const friendsList = Object.keys(hops).filter(i=> hops[i] == 1);// this also returns myself (hops == 0)
        author.isFriend = (friendsList.indexOf(authorId) > -1);
        return done(er,author);
      });

    })
  );

}


function mdParseUrl(s,isImg){

  if (isImg){
    return `${imageDomain}/blob/${encodeURIComponent(s)}`
  }
  else{
    if (s.indexOf('@') === 0){
      return '/profile/'+encodeURIComponent(s).replace('.','%2E')
    }else if (s.indexOf('#') === 0){
      return '/channel/'+encodeURIComponent(s.slice(1))
    }else if (s.indexOf('%') === 0){
      return '/post/'+encodeURIComponent(s).replace('.','%2E')
    }
    return s;
  }
}

const parseMd = function(md){
  return markDown.block(fixEmojis(md),{toUrl:mdParseUrl});
}

function isPost(entry){
  return entry.value &&
    entry.value.content &&
    entry.value.content.type &&
    entry.value.content.type == 'post'
}

function getValue(entry){
  // add the key to it as well
  entry.value.key = entry.key;
  return entry.value;
}

function markdownPost(p){
  if (!isPost(p)){return p}
  p.value.content.text = sanitize(parseMd(p.value.content.text));
  return p;
}

// determine if a post is root or reply
function isRoot(entry){
  return entry.value &&
    entry.value.content &&
    entry.value.content.type &&
    entry.value.content.type == 'post' &&
    !entry.value.content.root &&
    !entry.value.content.branch
}


function addPostMetadata(sbot){
  return function(post,done){
    post._metadata = {};

    var stream = sbot.links({
      dest:post.key,
      values:true
    });

    pull(
      stream,
      take(100),// limit to 100 replies for sanity
      map(markdownPost),
      collect(function(er,results){
        if(er){return done(er);}
        post.value._metadata = {};
        post.value._metadata.links = results;
        // now get just votes for this link
        async.forEach(post.value._metadata.links,function itaree(link,cb){
          if (!isPost(link)){
            return cb(null);// don't mutate this
          }

          var stream = sbot.links({
            dest:link.key,
            values:true,
            rel:'vote',
          });

          pull(
            stream,
            take(100),
            collect(function(er,results){
              if(er){return cb(er);}
              // NOW mutate the link
              link.value._metadata = {};
              link.value._metadata.links = results;
              // we're done with this link
              return cb(null);
            })
          )

        },function asyncComplete(er){
          return done(er,post);
        });

      })
    )

  }
}


// TODO: don't return user' posts that were replies to themself.  Check the `reply` key on the value.
exports.getUserPosts = function(sbot,options,done){

  const id = options.id;
  const count = options.count;
  const start = options.start;

  const streamOpts = {
    id:id,
    live:false,
    values:true,
    reverse:true
  };

  if (start == Infinity){
    // this means just start at the top
  }else{
    streamOpts.lt=start
  }

  const stream = sbot.createUserStream(streamOpts);

  pull(
    stream,
    filter(isPost),
    take(count),
    asyncMap(addPostMetadata(sbot)),
    map(markdownPost),
    map(getValue),
    collect(done)
  );

}

// this is the timeline
exports.getPosts = function(sbot,options,done){

  var count = options.count;
  const start = options.start;

  const stream = sbot.createFeedStream({
    live:false,
    lt:start,
    reverse:true
  });

  pull(
    stream,
    filter(isPost),
    filter(isRoot),
    take(count),
    map(markdownPost),
    asyncMap(addPostMetadata(sbot)),
    map(getValue),
    collect(done)
  );

}

// timeline but also look for a specific channel
exports.getChannel = function(sbot,options,done){
  const count = options.count;
  const start = options.start;
  const channel = options.channel;

  function inChannel(entry){
    return entry.value && entry.value.content && entry.value.content.channel === channel;
  }

  const stream = sbot.createFeedStream({
    live:false,
    lt:start,
    reverse:true
  });

  pull(
    stream,
    filter(inChannel),
    filter(isPost),
    filter(isRoot),
    take(count),
    map(markdownPost),
    asyncMap(addPostMetadata(sbot)),
    map(getValue),
    collect(done)
  );
}

// render a single post's thread
exports.getThread = function(sbot,postId,done){

  // this logic mimics the logic of hte getPosts stream
  sbot.get(postId,function(er,result){// this returns the value of hte post for some reason
    if(er){return done(er);}

    var post = {key:postId,value:result};
    post = markdownPost(post);

    addPostMetadata(sbot)(post,function(er,post){
      if(er){return done(er);}
      return done(null,getValue(post));
    });

  });

}


// TODO: this can be easily optimized with pull-merge to merge the friends streams
exports.getFriendsPosts = function(sbot,options,done){

  var count = options.count;
  const start = options.start;

  sbot.friends.hops({hops: 1,graph:'follow'}, function(er,hops){

    if (er){return done(er)}

    const friendsList = Object.keys(hops).filter(i=> hops[i] == 1);// this also returns myself (hops == 0)

    function isFriend(post){
      return friendsList.indexOf(post.value.author) > -1;
    }

    const stream = sbot.createFeedStream({
      live:false,
      lte:start,
      reverse:true
    });

    pull(
      stream,
      filter(isFriend),
      filter(isPost),
      take(count),
      map(markdownPost),
      asyncMap(addPostMetadata(sbot)),
      map(getValue),
      collect(done)
    );

  });

}

exports.createPost = function(sbot,post,done){

  if (typeof post.text !== 'string' || post.text.length < 1){
    return done(new Error('Post has no text and I refuse to publish it'))
  }

  if (post.root ^ post.branch){
    return done(new Error('either include both a root and branch or neither at all'))
  }

  if (post.root && !post.reply){
    return done(new Error('include a reply context or PREPARE TO FACE THE CONSEQUENCES'))
  }

  var pubObj = {
    type:'post'
  };

  var inherits = ['channel','root','branch','reply','text'];
  inherits.forEach(key=>{
    if (typeof post[key] !== 'undefined'){
      pubObj[key] = post[key]
    }
  })

  sbot.publish(pubObj,done);

}

// "unlike" is dumb and you should never need to do it
exports.createLike = function(sbot,data,done){
  /*
   make sure it fits this schema:
  {
   "type": "vote",
   "channel":str,
   "vote": {
     "link": id,
     "value": 1,              // unlike is similar, but value===0 and expression is "Unlike"
     "expression": "Like"
   }
  };
  */

  if(
    data.type !== 'vote' ||
    !data.vote ||
    data.vote.value !== 1 ||
    typeof data.vote.link !== 'string' ||
    data.vote.expression !== 'Like'
  ){
    return done(new Error('the like failed to validate, sorry'))
  }

  // now publish it
  sbot.publish(data,done);
}


exports.getEntries = function(sbot,options,done){

  const count = options.count;
  const start = options.start;

  const stream = sbot.createFeedStream({
    live:false,
    lte:start,
    reverse:true
  });

  pull(
    stream,
    take(count),
    map(getValue),
    collect(done)
  );
}

exports.getBlob = function(sbot,id,done){

  var id = decodeURIComponent(id);

  sbot.blobs.want(id,function(er,alreadyHadIt){
    if(er){return done(er);}

    const stream = sbot.blobs.get(id);

    // TODO: write the buffers directly to the response stream instead of loading into memory
    pull(
      stream,
      collect(function(er,results){
        if(er){return done(er)}
        if (results.length < 1){
          return done(new Error('blob not found: '+id));
        }
        console.log('found blob: '+id)
        var res = Buffer.concat(results);
        return done(null,res);
      })
    );

  })

}

// This writes the blobs to the response
exports.pipeBlobToStream = function(sbot,id,res){

  var id = decodeURIComponent(id);
  var wroteStatus = false;

  sbot.blobs.want(id,function(er,alreadyHadIt){
    if(er){
      res.status(500);
      return res.send(er);
    }

    const stream = sbot.blobs.get(id);

    // write the buffers directly to the response stream instead of loading into memory
    pull(
      stream,
      drain(function gotData(blob){
        if(!wroteStatus){
          res.set({'Cache-Control':'Max-Age=31556926'})
          res.status(200);
          wroteStatus = true;
        }
        res.write(blob);
      },function done(er){
        if(!wroteStatus && er){
          res.status(500);
          res.send(er)
          return;
        }
        // either getting blobs broke halfway or actually went fine
        return res.end();

      })
    );

  })
}

exports.whoami = function(sbot,done){
  sbot.whoami(function(er,data){
    return done(er,data?data.id:null)
  });
}

exports.addInvite = function(sbot,invitation,done){
  sbot.invite.accept(invitation,done);
}

exports.follow = function(sbot,userid,done){
  sbot.publish({
    type: 'contact',
    contact: userid,
    following: true
  }, done)
}

exports.unfollow = function(sbot,userid,done){
  sbot.publish({
    type: 'contact',
    contact: userid,
    following: false
  }, done)
}

exports.block = function(sbot,userid,done){
  sbot.publish({
    type: 'contact',
    contact: userid,
    blocking: true
  }, done)
}

exports.unblock = function(sbot,userid,done){
  sbot.publish({
    type: 'contact',
    contact: userid,
    blocking: false
  }, done)
}

// set user profile data
exports.setProfileData = function(sbot,opts,done){
  var id = opts.id;
  var key = opts.key;
  var value = opts.value;  

  var acceptable = ['image','name','description'];
  if (!key in acceptable){
    return done(new Error('not a valid key to set on a user profile: '+key))
  }

  /*
   make sure it fits this schema:
  {
   "type": "about",
   "about":id,
   "image":ref OR "name":"str" OR "description":"markdown"
  };
  */

  var pubObj = {
    type:"about",
    about:id
  };

  pubObj[key] = value;

  sbot.publish(pubObj,done)

}
